import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { canEditRegistration, isTeamAccessible } from '@/lib/teams/classification'
import {
  describeReportingLocationChange,
  validateReportingLocation,
  type ReportingLocation,
} from '@/lib/teams/reporting-location'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TEAM_LOCATION_FIELDS =
  'id, source_team_id, team_name, institution, panel_number, reporting_block, table_number'

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } }
  )
}

function toLocation(team: {
  panel_number: number | null
  reporting_block: string | null
  table_number: number | null
}): ReportingLocation {
  return {
    panel_number: team.panel_number ?? null,
    reporting_block: team.reporting_block ?? null,
    table_number: team.table_number ?? null,
  }
}

/**
 * GET /api/admin/teams/[id]/reporting-location
 * Read access for every active admin, restricted to their assigned desk.
 * Returns the latest values straight from public.teams.
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

  const { data: team, error } = await supabase
    .from('teams')
    .select(TEAM_LOCATION_FIELDS)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return jsonError('Could not load the reporting location.', 500)
  }

  if (!team) {
    return jsonError('Team not found.', 404)
  }

  if (!isTeamAccessible(session.profile, team.institution)) {
    return jsonError(
      `Access forbidden: You are assigned to the ${session.profile.desk?.toUpperCase()} desk and cannot access teams from another desk.`,
      403
    )
  }

  return NextResponse.json(
    {
      location: toLocation(team),
      team: {
        id: team.id,
        source_team_id: team.source_team_id,
        team_name: team.team_name,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

/**
 * Writes the audit entry into the existing verification_audit_logs table.
 * Returns an error message when the entry could not be written.
 */
async function writeLocationAudit(params: {
  supabase: ReturnType<typeof createAdminClient>
  team: {
    id: string
    source_team_id: string | null
    team_name: string | null
  }
  previous: ReportingLocation
  next: ReportingLocation
  admin: { id: string; email: string | null }
}): Promise<string | null> {
  const { supabase, team, previous, next, admin } = params

  const payload = {
    team_id: team.id,
    field_name: 'reporting_location',
    // The audit row records a location assignment, not a boolean checkpoint.
    previous_value: false,
    new_value: true,
    admin_id: admin.id,
    admin_email: admin.email,
    action_type: 'reporting_location_updated',
    reason: describeReportingLocationChange(previous, next),
    details: {
      team_name: team.team_name,
      source_team_id: team.source_team_id,
      previous,
      new: next,
    },
  }

  const { error } = await supabase
    .from('verification_audit_logs')
    .insert(payload)

  if (!error) return null

  // Database without the optional `details` column yet: keep the audit entry,
  // the readable change summary is still stored in `reason`.
  if (error.code === 'PGRST204' || error.code === '42703') {
    const { details: _details, ...withoutDetails } = payload
    const retry = await supabase
      .from('verification_audit_logs')
      .insert(withoutDetails)

    return retry.error ? retry.error.message : null
  }

  return error.message
}

/**
 * PATCH /api/admin/teams/[id]/reporting-location
 * Super Admin only. Writes the three reporting-location columns onto the
 * existing team row and appends an audit entry. No other team field is touched.
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
    return jsonError(
      'Super Admin authorization required to edit reporting locations.',
      403
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid request body.', 400)
  }

  if (!body || typeof body !== 'object') {
    return jsonError('Invalid request data.', 400)
  }

  const payload = body as Record<string, unknown>
  const validation = validateReportingLocation({
    panel_number: payload.panel_number,
    reporting_block: payload.reporting_block,
    table_number: payload.table_number,
  })

  if (!validation.ok || !validation.value) {
    const firstError =
      validation.errors.panel_number ??
      validation.errors.reporting_block ??
      validation.errors.table_number ??
      'Invalid reporting location.'

    return NextResponse.json(
      { error: firstError, fieldErrors: validation.errors },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const next = validation.value
  const { id } = await params
  const supabase = createAdminClient()

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select(TEAM_LOCATION_FIELDS)
    .eq('id', id)
    .maybeSingle()

  if (teamError) {
    return jsonError('Could not load the team.', 500)
  }

  if (!team) {
    return jsonError('Team not found.', 404)
  }

  const previous = toLocation(team)
  const unchanged =
    previous.panel_number === next.panel_number &&
    (previous.reporting_block ?? '').toUpperCase() === next.reporting_block &&
    previous.table_number === next.table_number

  if (unchanged) {
    return jsonError('The reporting location is unchanged.', 400)
  }

  // Table numbers are unique across the evaluation layout, so a duplicate
  // means the team would be sent to another team's evaluation table.
  const { data: conflict, error: conflictError } = await supabase
    .from('teams')
    .select('source_team_id')
    .eq('table_number', next.table_number)
    .neq('id', id)
    .limit(1)
    .maybeSingle()

  if (conflictError) {
    return jsonError('Could not validate the table assignment.', 500)
  }

  if (conflict) {
    return jsonError(
      `Table ${next.table_number} is already assigned to team ${conflict.source_team_id}. Choose a different table number.`,
      409
    )
  }

  const { error: updateError } = await supabase
    .from('teams')
    .update(next)
    .eq('id', id)

  if (updateError) {
    return jsonError('Could not update the reporting location.', 500)
  }

  const auditError = await writeLocationAudit({
    supabase,
    team,
    previous,
    next,
    admin: { id: session.profile.id, email: session.profile.email },
  })

  if (auditError) {
    // Never leave an unaudited location behind: revert to the previous values.
    const { error: revertError } = await supabase
      .from('teams')
      .update(previous)
      .eq('id', id)

    if (revertError) {
      console.error(
        'Reporting location revert failed after audit error:',
        revertError
      )
    }

    return jsonError(
      'Reporting location was not saved because its audit entry could not be written. Apply supabase/migrations/20261120_reporting_location_management.sql in the Supabase SQL editor, then try again.',
      500
    )
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Reporting location updated successfully.',
      location: next,
      previousLocation: previous,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
