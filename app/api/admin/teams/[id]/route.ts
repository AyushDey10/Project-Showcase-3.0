import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { isTeamAccessible, canEditRegistration } from '@/lib/teams/classification'
import { invalidateRegistrationCache } from '@/lib/supabase/event-cache'
import { enqueueSheetsSync } from '@/lib/sheets/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } }
  )
}

/**
 * GET /api/admin/teams/[id]
 * Enforces desk separation: Regular admins can ONLY view teams belonging to their assigned desk.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()

  if (!session) {
    return jsonError('Admin authorization required.', 403)
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (teamError) {
    return jsonError('Could not load team details.', 500)
  }

  if (!team) {
    return jsonError('Team not found.', 404)
  }

  // Strict Desk Separation Enforcement
  if (!isTeamAccessible(session.profile, team.institution)) {
    return jsonError(
      `Access forbidden: You are assigned to the ${session.profile.desk?.toUpperCase()} desk and cannot access teams from another desk.`,
      403
    )
  }

  const [studentsResult, verificationResult, auditResult] = await Promise.all([
    supabase
      .from('students')
      .select('id, team_id, name, enrollment_no, role, mobile, email, created_at')
      .eq('team_id', id)
      .order('created_at', { ascending: true }),

    supabase
      .from('team_verifications')
      .select('team_id, reported, reported_at, reported_by, photo_id_checked, photo_id_checked_at, photo_id_checked_by, noc_received, noc_received_at, noc_received_by')
      .eq('team_id', id)
      .maybeSingle(),

    supabase
      .from('verification_audit_logs')
      .select('id, event_no, team_id, field_name, previous_value, new_value, action_type, admin_id, admin_email, reason, reversed_log_id, created_at')
      .eq('team_id', id)
      .order('event_no', { ascending: false })
      .limit(50),
  ])

  if (studentsResult.error || verificationResult.error || auditResult.error) {
    return jsonError('Could not load complete team information.', 500)
  }

  return NextResponse.json(
    {
      team,
      students: studentsResult.data ?? [],
      verification: verificationResult.data ?? {
        reported: false,
        reported_at: null,
        reported_by: null,
        photo_id_checked: false,
        photo_id_checked_at: null,
        photo_id_checked_by: null,
        noc_received: false,
        noc_received_at: null,
        noc_received_by: null,
      },
      activity: auditResult.data ?? [],
      canEdit: canEditRegistration(session.profile),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

/**
 * PATCH /api/admin/teams/[id]
 * Super Admin only: Edit team registration details.
 * Protects attendance data: Never touches team_verifications.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()

  if (!session) {
    return jsonError('Admin authorization required.', 403)
  }

  if (!canEditRegistration(session.profile)) {
    return jsonError('Super Admin authorization required to edit team registration details.', 403)
  }

  const { id } = await params
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid request body.', 400)
  }

  if (!body || typeof body !== 'object') {
    return jsonError('Invalid request data.', 400)
  }

  const updates = body as Record<string, unknown>
  const allowedFields = [
    'team_name',
    'institution',
    'project_title',
    'project_domain',
    'faculty_mentor',
    'team_size',
    'leader_name',
    'leader_enrollment_no',
    'leader_mobile',
    'leader_email',
  ]

  const filteredUpdates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (typeof updates[field] === 'string') {
        filteredUpdates[field] = (updates[field] as string).trim() || null
      } else {
        filteredUpdates[field] = updates[field]
      }
    }
  }

  if (filteredUpdates.team_name === null || filteredUpdates.team_name === '') {
    return jsonError('Team name is required.', 400)
  }

  if (filteredUpdates.team_size !== undefined) {
    const size = Number(filteredUpdates.team_size)
    if (!Number.isInteger(size) || size < 1 || size > 20) {
      return jsonError('Team size must be a number between 1 and 20.', 400)
    }
    filteredUpdates.team_size = size
  }

  if (filteredUpdates.leader_email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(filteredUpdates.leader_email))) {
      return jsonError('Invalid team leader email address.', 400)
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    return jsonError('No valid update fields provided.', 400)
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('teams')
    .update(filteredUpdates)
    .eq('id', id)

  if (error) {
    return jsonError('Could not update team registration.', 500)
  }

  // Invalidate registration cache so team directory, dashboard, and desk assignments reflect immediately
  invalidateRegistrationCache()

  // Enqueue Google Sheets synchronization
  enqueueSheetsSync({
    entityType: 'team',
    entityId: id,
    action: 'UPSERT',
    payload: { teamId: id },
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    message: 'Team registration details updated successfully.',
  })
}
