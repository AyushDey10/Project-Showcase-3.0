import { getTeamDesk } from '@/lib/teams/classification'
import { getCheckpointProgress } from '@/lib/teams/verification'
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TEAM_FIELDS = `
  id,
  source_team_id,
  team_name,
  institution,
  project_title,
  project_domain,
  faculty_mentor,
  team_size,
  leader_name,
  leader_enrollment_no,
  leader_mobile,
  leader_email
`

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function GET(request: Request) {
  const session = await getAdminSession()

  if (!session) {
    return jsonError('Admin authorization required.', 403)
  }

  const { profile } = session
  const params = new URL(request.url).searchParams
  const search = (params.get('q') ?? '').trim().replace(/[,%_()]/g, ' ')
  let requestedCategory = params.get('category') ?? 'all'
  const statusFilter = (params.get('status') ?? 'all').trim().toLowerCase()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 25))

  // Enforce Desk Scoping:
  // If user is a Regular Admin, force the category to their assigned desk regardless of query parameter.
  let activeCategory: 'all' | 'internal' | 'external' = 'all'

  if (profile.role === 'admin') {
    if (!profile.desk || (profile.desk !== 'internal' && profile.desk !== 'external')) {
      return jsonError('Administrator account is missing an assigned desk. Contact Super Admin.', 403)
    }
    // Strict enforcement: regular admin CANNOT view other desk or 'all'
    activeCategory = profile.desk
  } else {
    // Super Admin can choose 'all', 'internal', or 'external'
    if (['all', 'internal', 'external'].includes(requestedCategory)) {
      activeCategory = requestedCategory as 'all' | 'internal' | 'external'
    } else {
      activeCategory = 'all'
    }
  }

  const supabase = createAdminClient()
  let teamIds: string[] | null = null

  // One read of the checkpoint table, started before the team query so both
  // requests are in flight together. It serves the completion filter and the
  // per-row flags, replacing what used to be two serialised table reads.
  const verificationsPromise = supabase
    .from('team_verifications')
    .select('team_id, reported, photo_id_checked, noc_received')

  // Search across both team registration details and student members
  if (search) {
    const pattern = `%${search}%`

    const [teamMatches, studentMatches] = await Promise.all([
      supabase
        .from('teams')
        .select('id')
        .or(
          [
            `source_team_id.ilike.${pattern}`,
            `team_name.ilike.${pattern}`,
            `institution.ilike.${pattern}`,
            `project_title.ilike.${pattern}`,
            `project_domain.ilike.${pattern}`,
            `faculty_mentor.ilike.${pattern}`,
            `leader_name.ilike.${pattern}`,
            `leader_enrollment_no.ilike.${pattern}`,
            `leader_mobile.ilike.${pattern}`,
            `leader_email.ilike.${pattern}`,
          ].join(',')
        )
        .limit(200),

      supabase
        .from('students')
        .select('team_id')
        .or(
          [
            `name.ilike.${pattern}`,
            `enrollment_no.ilike.${pattern}`,
            `mobile.ilike.${pattern}`,
            `email.ilike.${pattern}`,
          ].join(',')
        )
        .limit(500),
    ])

    if (teamMatches.error || studentMatches.error) {
      return jsonError('Could not search teams.', 500)
    }

    teamIds = [
      ...new Set([
        ...(teamMatches.data ?? []).map((team) => team.id),
        ...(studentMatches.data ?? []).map((student) => student.team_id),
      ]),
    ]

    if (teamIds.length === 0) {
      return NextResponse.json(
        {
          teams: [],
          total: 0,
          page,
          pageSize,
          deskScope: profile.role === 'admin' ? profile.desk : 'all',
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }
  }

  // Filter by completion status using the class-specific workflow:
  // internal teams need Identity + Reported (2), external teams need NOC +
  // Identity + Reported (3). Classification comes from each team's institution.
  if (['completed', 'in_progress', 'not_started'].includes(statusFilter)) {
    const [verificationsRes, teamsRes] = await Promise.all([
      verificationsPromise,
      supabase.from('teams').select('id, institution'),
    ])

    if (verificationsRes.error || teamsRes.error) {
      return jsonError('Could not load teams.', 500)
    }

    const vMap = new Map((verificationsRes.data ?? []).map((v) => [v.team_id, v]))
    const institutionById = new Map(
      (teamsRes.data ?? []).map((t) => [t.id, t.institution])
    )

    const candidateIds = teamIds ?? (teamsRes.data ?? []).map((t) => t.id)

    teamIds = candidateIds.filter((tId) => {
      const progress = getCheckpointProgress(
        institutionById.get(tId) ?? null,
        vMap.get(tId)
      )

      if (statusFilter === 'completed') return progress.status === 'completed'
      if (statusFilter === 'in_progress') return progress.status === 'in_progress'
      if (statusFilter === 'not_started') return progress.status === 'not_started'
      return true
    })

    if (teamIds.length === 0) {
      return NextResponse.json(
        {
          teams: [],
          total: 0,
          page,
          pageSize,
          deskScope: profile.role === 'admin' ? profile.desk : 'all',
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }
  }

  let query = supabase
    .from('teams')
    .select(TEAM_FIELDS, { count: 'exact' })
    .order('source_team_id', { ascending: true })

  if (teamIds) {
    query = query.in('id', teamIds)
  }

  // Single server-side classification rule:
  // Bennett (case-insensitive) = internal, all other institutions = external
  if (activeCategory === 'internal') {
    query = query.ilike('institution', '%Bennett%')
  } else if (activeCategory === 'external') {
    query = query.or('institution.is.null,institution.not.ilike.%Bennett%')
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const [teamsResult, verificationsResult] = await Promise.all([
    query.range(from, to),
    verificationsPromise,
  ])

  const { data, error, count } = teamsResult

  if (error) {
    return jsonError('Could not load teams.', 500)
  }

  const teamIdsOnPage = (data ?? []).map((t) => t.id)
  const idsOnPage = new Set(teamIdsOnPage)
  const verificationsMap = new Map<
    string,
    { reported: boolean; photo_id_checked: boolean; noc_received: boolean }
  >()

  for (const v of verificationsResult.data ?? []) {
    if (!idsOnPage.has(v.team_id)) continue
    verificationsMap.set(v.team_id, {
      reported: Boolean(v.reported),
      photo_id_checked: Boolean(v.photo_id_checked),
      noc_received: Boolean(v.noc_received),
    })
  }

  const teamsWithVerifications = (data ?? []).map((team) => {
    const v = verificationsMap.get(team.id)
    return {
      ...team,
      desk: getTeamDesk(team.institution),
      reported: v ? v.reported : false,
      photo_id_checked: v ? v.photo_id_checked : false,
      noc_received: v ? v.noc_received : false,
    }
  })

  return NextResponse.json(
    {
      teams: teamsWithVerifications,
      total: count ?? 0,
      page,
      pageSize,
      deskScope: profile.role === 'admin' ? profile.desk : 'all',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
