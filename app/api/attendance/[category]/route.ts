import { z } from 'zod'
import { createServiceClient, getTeamMapping, mapTeamRow, maskEmail, normalizeEmail, selectedColumns } from '@/lib/attendance/source'
import type { TeamCategory } from '@/lib/attendance/source'

export const runtime = 'nodejs'

const requestSchema = z.object({ email: z.string().trim().email().max(254) }).strict()
const attempts = new Map<string, { count: number; expiresAt: number }>()
const gmailPattern = /^[^\s@]+@gmail\.com$/i
const wrongCategoryMessage = 'Please scan the correct attendance QR code for your team category.'
const notRegisteredMessage = 'This Gmail ID is not registered for this attendance category. Please check your registered email or contact the event coordinator.'
const alreadyPresentMessage = 'Attendance has already been recorded for this team.'

type RouteContext = { params: Promise<{ category: string }> }

function consumeAttempt(ip: string) {
  const now = Date.now()
  const key = ip.slice(0, 128)
  const existing = attempts.get(key)
  if (!existing || existing.expiresAt <= now) {
    if (attempts.size >= 5000) {
      for (const [storedIp, entry] of attempts) if (entry.expiresAt <= now) attempts.delete(storedIp)
      if (attempts.size >= 5000) return false
    }
    attempts.set(key, { count: 1, expiresAt: now + 60_000 })
    return true
  }
  if (existing.count >= 20) return false
  existing.count += 1
  return true
}

function exactEmailPattern(email: string) {
  return email.replace(/[\\%_]/g, '\\$&')
}

function apiError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request, context: RouteContext) {
  const { category: routeCategory } = await context.params
  if (routeCategory !== 'internal' && routeCategory !== 'external') return apiError('Attendance route not found.', 404)
  const category = routeCategory as TeamCategory
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 2048) return apiError('Invalid attendance request.', 400)

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid attendance request.', 400) }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return apiError('Enter a valid Gmail address.', 400)
  const email = normalizeEmail(parsed.data.email)
  if (!gmailPattern.test(email)) return apiError('Enter a valid Gmail address.', 400)

  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!consumeAttempt(ip)) return apiError('Too many attempts. Please wait a minute before trying again.', 429)

  const { mapping } = getTeamMapping()
  const client = createServiceClient()
  if (!mapping || !client) {
    return apiError('Attendance verification is temporarily unavailable. Please contact an event coordinator.', 503)
  }

  const lookupCategory = async (targetCategory: TeamCategory) => {
    const { data, error } = await client.from(mapping.table).select(selectedColumns(mapping)).ilike(mapping.email, exactEmailPattern(email)).eq(mapping.category, targetCategory).limit(2)
    if (error || !data) return { candidates: [], failed: true }
    const candidates = (data as unknown as Record<string, unknown>[])
      .filter((row) => normalizeEmail(row[mapping.email]) === email)
      .map((row) => ({ row, team: mapTeamRow(row, mapping) }))
      .filter((candidate): candidate is { row: Record<string, unknown>; team: NonNullable<ReturnType<typeof mapTeamRow>> } => Boolean(candidate.team))
    return { candidates, failed: false }
  }

  const categoryLookup = await lookupCategory(category)
  if (categoryLookup.failed) return apiError('Attendance verification is temporarily unavailable. Please contact an event coordinator.', 503)
  if (!categoryLookup.candidates.length) {
    const otherCategory = category === 'internal' ? 'external' : 'internal'
    const otherLookup = await lookupCategory(otherCategory)
    if (otherLookup.failed) return apiError('Attendance verification is temporarily unavailable. Please contact an event coordinator.', 503)
    return apiError(otherLookup.candidates.length ? wrongCategoryMessage : notRegisteredMessage, otherLookup.candidates.length ? 409 : 404)
  }
  if (categoryLookup.candidates.length !== 1) return apiError('We could not verify this team. Please contact an event coordinator.', 409)

  const [{ row, team }] = categoryLookup.candidates
  if (team.status === 'PRESENT' || team.checkedInAt) return apiError(alreadyPresentMessage, 409)

  const checkedInAt = new Date().toISOString()
  let update = client.from(mapping.table).update({ [mapping.status]: 'PRESENT', [mapping.checkedInAt]: checkedInAt }).eq(mapping.id, team.teamId).eq(mapping.category, category)
  const currentStatus = row[mapping.status]
  update = currentStatus === null || currentStatus === undefined ? update.is(mapping.status, null) : update.eq(mapping.status, currentStatus)
  const { data: updated, error: updateError } = await update.select(selectedColumns(mapping)).maybeSingle()
  if (updateError) return apiError('Attendance verification is temporarily unavailable. Please contact an event coordinator.', 503)

  if (!updated) {
    const { data: latest, error: latestError } = await client.from(mapping.table).select(`${mapping.status},${mapping.checkedInAt}`).eq(mapping.id, team.teamId).maybeSingle()
    const latestRow = latest as unknown as Record<string, unknown> | null
    if (!latestError && latestRow && (String(latestRow[mapping.status] ?? '').trim().toUpperCase() === 'PRESENT' || latestRow[mapping.checkedInAt])) {
      return apiError(alreadyPresentMessage, 409)
    }
    return apiError('We could not complete this check-in. Please try again or contact an event coordinator.', 409)
  }

  return Response.json({
    status: 'PRESENT',
    team: {
      leaderName: team.leaderName,
      maskedEmail: maskEmail(email),
      category,
      checkedInAt,
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
