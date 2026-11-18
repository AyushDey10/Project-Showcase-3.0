import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedRegistrationData } from '@/lib/supabase/event-cache'
import { computeVerificationStats } from '@/lib/teams/verification-stats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const actor = await getAdminUser()

  if (!actor) {
    return NextResponse.json(
      { error: 'Administrator authorization required to view live display statistics.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const supabase = createAdminClient()

  try {
    const [registration, verificationsRes] = await Promise.all([
      getCachedRegistrationData(),
      supabase
        .from('team_verifications')
        .select('team_id, reported, photo_id_checked, noc_received'),
    ])

    // Class-aware completion: internal teams require Identity + Reported (2),
    // external teams require NOC + Identity + Reported (3).
    const stats = computeVerificationStats(
      registration.teams,
      verificationsRes.data ?? []
    )

    return NextResponse.json(
      {
        totalTeams: stats.totalTeams,
        totalStudents: registration.totalStudents,
        reportedCount: stats.reportedCount,
        photoIdCount: stats.photoIdCount,
        nocCount: stats.nocCount,
        fullyVerifiedCount: stats.fullyVerifiedCount,
        completedCheckpoints: stats.completedCheckpoints,
        requiredCheckpoints: stats.requiredCheckpoints,
        progress: stats.progress,
        internal: stats.internal,
        external: stats.external,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (err: unknown) {
    console.error('Error in /api/display/stats:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred while calculating statistics.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
