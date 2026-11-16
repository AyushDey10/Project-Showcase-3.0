import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export type TeamCategory = 'internal' | 'external'
export type AttendanceStatus = 'PRESENT' | 'ABSENT'

export type TeamRecord = {
  teamId: string
  teamName: string
  leaderName: string
  leaderEmail: string
  memberNames: string[]
  totalMembers: number | null
  category: TeamCategory
  categoryValue: string
  status: AttendanceStatus
  checkedInAt: string | null
}

export type TeamSource = {
  teams: TeamRecord[]
  configured: boolean
  issue: 'mapping_missing' | 'credentials_missing' | 'source_unavailable' | null
  missing: string[]
  tableName: string | null
}

type TeamMapping = {
  table: string
  id: string
  name: string
  leader: string
  email: string
  members: string | null
  totalMembers: string | null
  category: string
  status: string
  checkedInAt: string
}

const mappingKeys = {
  table: 'ATTENDANCE_TEAM_TABLE',
  id: 'ATTENDANCE_TEAM_ID_COLUMN',
  name: 'ATTENDANCE_TEAM_NAME_COLUMN',
  leader: 'ATTENDANCE_LEADER_NAME_COLUMN',
  email: 'ATTENDANCE_LEADER_EMAIL_COLUMN',
  category: 'ATTENDANCE_TEAM_CATEGORY_COLUMN',
  status: 'ATTENDANCE_STATUS_COLUMN',
  checkedInAt: 'ATTENDANCE_CHECKED_IN_AT_COLUMN',
} as const

const optionalMappingKeys = {
  members: 'ATTENDANCE_MEMBER_NAMES_COLUMN',
  totalMembers: 'ATTENDANCE_TOTAL_MEMBERS_COLUMN',
} as const

function isIdentifier(value: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value)
}

export function getTeamMapping(): { mapping: TeamMapping | null; missing: string[]; invalid: string[] } {
  const values = Object.fromEntries(Object.entries(mappingKeys).map(([key, envName]) => [key, process.env[envName]?.trim() ?? ''])) as Record<keyof typeof mappingKeys, string>
  const missing = Object.values(mappingKeys).filter((envName) => !process.env[envName]?.trim())
  const optional = Object.fromEntries(Object.entries(optionalMappingKeys).map(([key, envName]) => [key, process.env[envName]?.trim() || null])) as Record<keyof typeof optionalMappingKeys, string | null>
  const invalid: string[] = Object.entries(values).filter(([, value]) => value && !isIdentifier(value)).map(([key]) => mappingKeys[key as keyof typeof mappingKeys])
  for (const [key, value] of Object.entries(optional)) {
    if (value && !isIdentifier(value)) invalid.push(optionalMappingKeys[key as keyof typeof optionalMappingKeys])
  }
  if (missing.length || invalid.length) return { mapping: null, missing, invalid }
  return {
    mapping: { ...values, ...optional } as TeamMapping,
    missing: [],
    invalid: [],
  }
}

export function createServiceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

export function selectedColumns(mapping: TeamMapping) {
  return [...new Set([
    mapping.id,
    mapping.name,
    mapping.leader,
    mapping.email,
    mapping.members,
    mapping.totalMembers,
    mapping.category,
    mapping.status,
    mapping.checkedInAt,
  ].filter((value): value is string => Boolean(value)))].join(',')
}

function asMemberNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean)
  } catch {
    return [value.trim()]
  }
  return [value.trim()]
}

export function mapTeamRow(row: Record<string, unknown>, mapping: TeamMapping): TeamRecord | null {
  const categoryValue = String(row[mapping.category] ?? '')
  const category = categoryValue.trim().toLowerCase()
  if (category !== 'internal' && category !== 'external') return null
  const checkedInAt = row[mapping.checkedInAt] ? String(row[mapping.checkedInAt]) : null
  const statusValue = String(row[mapping.status] ?? '').trim().toUpperCase()
  const memberNames = mapping.members ? asMemberNames(row[mapping.members]) : []
  const rawCount = mapping.totalMembers ? row[mapping.totalMembers] : null
  const countValue = rawCount === null || rawCount === undefined || rawCount === '' ? (memberNames.length || null) : Number(rawCount)
  const teamId = String(row[mapping.id] ?? '')
  if (!teamId) return null
  return {
    teamId,
    teamName: String(row[mapping.name] ?? ''),
    leaderName: String(row[mapping.leader] ?? ''),
    leaderEmail: String(row[mapping.email] ?? ''),
    memberNames,
    totalMembers: countValue === null ? null : Number.isFinite(countValue) ? countValue : null,
    category,
    categoryValue,
    status: statusValue === 'PRESENT' || checkedInAt ? 'PRESENT' : 'ABSENT',
    checkedInAt,
  }
}

export async function readTeamSource(): Promise<TeamSource> {
  const { mapping, missing, invalid } = getTeamMapping()
  if (!mapping) return { teams: [], configured: false, issue: 'mapping_missing', missing: [...missing, ...invalid], tableName: null }
  const client = createServiceClient()
  if (!client) return { teams: [], configured: false, issue: 'credentials_missing', missing: [], tableName: mapping.table }
  const rows: Record<string, unknown>[] = []
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.from(mapping.table).select(selectedColumns(mapping)).order(mapping.id, { ascending: true }).range(offset, offset + pageSize - 1)
    if (error || !data) return { teams: [], configured: true, issue: 'source_unavailable', missing: [], tableName: mapping.table }
    rows.push(...(data as unknown as Record<string, unknown>[]))
    if (data.length < pageSize) break
  }
  const teams = rows.map((row) => mapTeamRow(row, mapping)).filter((team): team is TeamRecord => Boolean(team))
  return { teams, configured: true, issue: null, missing: [], tableName: mapping.table }
}

export function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

export function maskEmail(value: string) {
  const [local = '', domain = ''] = value.split('@')
  const visible = local.length <= 2 ? local.slice(0, 1) : `${local.slice(0, 2)}${'•'.repeat(Math.min(local.length - 2, 8))}`
  return `${visible}@${domain}`
}
