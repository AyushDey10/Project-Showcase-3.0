import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedRegistrationData } from '@/lib/supabase/event-cache'

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

    const teams = registration.teams
    const totalTeams = teams.length
    const totalStudents = registration.totalStudents

    const isInternal = (inst: string | null) =>
      Boolean(inst && inst.toLowerCase().includes('bennett'))

    const vMap = new Map((verificationsRes.data ?? []).map((v) => [v.team_id, v]))

    let reportedCount = 0
    let photoIdCount = 0
    let nocCount = 0
    let fullyVerifiedCount = 0

    let internalTotal = 0
    let internalReported = 0
    let internalPhotoId = 0
    let internalNoc = 0
    let internalFullyVerified = 0

    let externalTotal = 0
    let externalReported = 0
    let externalPhotoId = 0
    let externalNoc = 0
    let externalFullyVerified = 0

    for (const t of teams) {
      const v = vMap.get(t.id)
      const rep = Boolean(v?.reported)
      const pho = Boolean(v?.photo_id_checked)
      const noc = Boolean(v?.noc_received)
      const full = rep && pho && noc

      if (rep) reportedCount++
      if (pho) photoIdCount++
      if (noc) nocCount++
      if (full) fullyVerifiedCount++

      if (isInternal(t.institution)) {
        internalTotal++
        if (rep) internalReported++
        if (pho) internalPhotoId++
        if (noc) internalNoc++
        if (full) internalFullyVerified++
      } else {
        externalTotal++
        if (rep) externalReported++
        if (pho) externalPhotoId++
        if (noc) externalNoc++
        if (full) externalFullyVerified++
      }
    }

    const reportedPercent = totalTeams > 0 ? Math.round((reportedCount / totalTeams) * 100) : 0
    const photoIdPercent = totalTeams > 0 ? Math.round((photoIdCount / totalTeams) * 100) : 0
    const nocPercent = totalTeams > 0 ? Math.round((nocCount / totalTeams) * 100) : 0
    const fullyVerifiedPercent = totalTeams > 0 ? Math.round((fullyVerifiedCount / totalTeams) * 100) : 0

    const overallProgressPercent =
      totalTeams > 0
        ? Math.round(((reportedCount + photoIdCount + nocCount) / (totalTeams * 3)) * 100)
        : 0

    return NextResponse.json(
      {
        totalTeams,
        totalStudents,
        reportedCount,
        photoIdCount,
        nocCount,
        fullyVerifiedCount,
        progress: {
          overall: overallProgressPercent,
          fullyVerified: fullyVerifiedPercent,
          reported: reportedPercent,
          photoId: photoIdPercent,
          noc: nocPercent,
        },
        internal: {
          total: internalTotal,
          reported: internalReported,
          photoId: internalPhotoId,
          noc: internalNoc,
          fullyVerified: internalFullyVerified,
          percent: internalTotal > 0 ? Math.round((internalFullyVerified / internalTotal) * 100) : 0,
        },
        external: {
          total: externalTotal,
          reported: externalReported,
          photoId: externalPhotoId,
          noc: externalNoc,
          fullyVerified: externalFullyVerified,
          percent: externalTotal > 0 ? Math.round((externalFullyVerified / externalTotal) * 100) : 0,
        },
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
