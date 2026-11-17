import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isTeamAccessible } from '@/lib/teams/classification'
import { enqueueSheetsSync } from '@/lib/sheets/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json(
      { error: 'Admin authorization required.' },
      { status: 403 }
    )
  }

  const { profile } = session

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Invalid request data.' },
      { status: 400 }
    )
  }

  const {
    teamId,
    fieldName,
    value,
    reverseLogId,
    reason,
  } = body as Record<string, unknown>

  if (
    typeof teamId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(teamId)
  ) {
    return NextResponse.json(
      { error: 'Invalid team ID.' },
      { status: 400 }
    )
  }

  if (
    !['reported', 'photo_id_checked', 'noc_received'].includes(
      String(fieldName)
    )
  ) {
    return NextResponse.json(
      { error: 'Invalid verification field.' },
      { status: 400 }
    )
  }

  if (typeof value !== 'boolean') {
    return NextResponse.json(
      { error: 'Verification value must be true or false.' },
      { status: 400 }
    )
  }

  if (
    reverseLogId !== undefined &&
    (
      typeof reverseLogId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reverseLogId)
    )
  ) {
    return NextResponse.json(
      { error: 'Invalid audit log ID.' },
      { status: 400 }
    )
  }

  if (
    reason !== undefined &&
    (typeof reason !== 'string' || reason.trim().length > 500)
  ) {
    return NextResponse.json(
      { error: 'Reason must be 500 characters or fewer.' },
      { status: 400 }
    )
  }

  // Strict Desk Separation Enforcement:
  // Lookup team's institution to verify desk authorization
  const adminClient = createAdminClient()
  const { data: team, error: teamLookupError } = await adminClient
    .from('teams')
    .select('id, institution')
    .eq('id', teamId)
    .maybeSingle()

  if (teamLookupError || !team) {
    return NextResponse.json(
      { error: 'Team not found.' },
      { status: 404 }
    )
  }

  if (!isTeamAccessible(profile, team.institution)) {
    return NextResponse.json(
      {
        error: `Access forbidden: You are assigned to the ${profile.desk?.toUpperCase()} desk and cannot perform verification on teams from another desk.`,
      },
      { status: 403 }
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('set_team_verification', {
    p_team_id: teamId,
    p_field_name: fieldName,
    p_new_value: value,
    p_reverse_log_id: reverseLogId ?? null,
    p_reason: typeof reason === 'string' ? reason.trim() || null : null,
  })

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }

  // Trigger Google Sheets synchronization in background (non-blocking)
  enqueueSheetsSync({
    entityType: 'verification',
    entityId: teamId,
    action: 'UPSERT',
    payload: { teamId, fieldName, value },
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    auditLogId: data,
    message: 'Verification updated successfully.',
  })
}
