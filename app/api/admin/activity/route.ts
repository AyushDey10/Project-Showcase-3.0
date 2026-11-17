import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedRegistrationData } from '@/lib/supabase/event-cache'
import { getTeamDesk } from '@/lib/teams/classification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json(
      { error: 'Admin authorization required.' },
      { status: 403 }
    )
  }

  const { profile } = session
  const supabase = createAdminClient()
  const isSuperAdmin = profile.role === 'super_admin'

  const verificationPromise = supabase
    .from('verification_audit_logs')
    .select(
      'id, event_no, team_id, field_name, previous_value, new_value, action_type, admin_id, admin_email, reason, reversed_log_id, created_at'
    )
    .order('event_no', { ascending: false })
    .limit(200)

  const adminPromise = isSuperAdmin
    ? supabase
        .from('admin_audit_logs')
        .select(
          'id, actor_id, actor_email, target_admin_id, target_email, action_type, previous_role, new_role, reason, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(200)
    : Promise.resolve({ data: [] as unknown[], error: null })

  const registrationPromise = getCachedRegistrationData()

  // Fetch all admin profiles to enrich admin full names instead of showing raw IDs/emails
  const adminProfilesPromise = supabase
    .from('admin_profiles')
    .select('id, email, full_name')

  const [verificationRes, adminRes, registration, adminProfilesRes] = await Promise.all([
    verificationPromise,
    adminPromise,
    registrationPromise,
    adminProfilesPromise,
  ])

  if (verificationRes.error) {
    console.error('Error loading verification audit logs:', verificationRes.error)
    return NextResponse.json(
      { error: 'Could not load verification activity history.' },
      { status: 500 }
    )
  }

  const vLogs = verificationRes.data ?? []

  // Create lookup maps for admin names by id and by email
  const adminNameById = new Map<string, string>()
  const adminNameByEmail = new Map<string, string>()
  if (adminProfilesRes.data) {
    for (const p of adminProfilesRes.data) {
      if (p.full_name) {
        if (p.id) adminNameById.set(p.id, p.full_name)
        if (p.email) adminNameByEmail.set(p.email.toLowerCase(), p.full_name)
      }
    }
  }

  // Enrich verification logs with team details, volunteer name, and enforce desk separation
  const enrichedVerificationLogs = vLogs
    .map((log) => {
      const team = registration.teamMap.get(log.team_id)
      const desk = getTeamDesk(team?.institution)

      const adminName =
        (log.admin_id && adminNameById.get(log.admin_id)) ||
        (log.admin_email && adminNameByEmail.get(log.admin_email.toLowerCase())) ||
        log.admin_email ||
        'Administrator'

      return {
        ...log,
        reverse_log_id: log.reversed_log_id ?? null,
        admin_name: adminName,
        team_name:
          team?.team_name || (team?.source_team_id ? `Team ${team.source_team_id}` : null),
        source_team_id: team?.source_team_id ?? null,
        institution: team?.institution ?? null,
        desk,
      }
    })
    .filter((log) => {
      // Super Admin sees all logs
      if (isSuperAdmin) return true
      // Regular admin only sees logs for their assigned desk
      return log.desk === profile.desk
    })

  const adminLogs = isSuperAdmin ? (adminRes.data ?? []) : []

  return NextResponse.json(
    {
      verificationActivity: enrichedVerificationLogs,
      adminActivity: adminLogs,
      isSuperAdmin,
      deskScope: isSuperAdmin ? 'all' : profile.desk,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
