import { Suspense } from 'react'
import type { Metadata } from 'next'
import { requireAdminSession } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedRegistrationData } from '@/lib/supabase/event-cache'
import { computeVerificationStats } from '@/lib/teams/verification-stats'
import { LiveDisplay, type DisplayStats } from '@/components/display/live-display'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Live Display — Project Showcase 3.0',
  description: 'Live real-time telemetry and team verification progress for event displays.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

async function getInitialDisplayStats(): Promise<DisplayStats | null> {
  const supabase = createAdminClient()

  try {
    const [registration, verificationsRes] = await Promise.all([
      getCachedRegistrationData(),
      supabase
        .from('team_verifications')
        .select('team_id, reported, photo_id_checked, noc_received'),
    ])

    // Class-aware completion: internal (Bennett) teams require Identity +
    // Reported, external teams require NOC + Identity + Reported.
    const stats = computeVerificationStats(
      registration.teams,
      verificationsRes.data ?? []
    )

    return {
      totalTeams: stats.totalTeams,
      totalStudents: registration.totalStudents,
      reportedCount: stats.reportedCount,
      photoIdCount: stats.photoIdCount,
      nocCount: stats.nocCount,
      fullyVerifiedCount: stats.fullyVerifiedCount,
      progress: stats.progress,
      internal: stats.internal,
      external: stats.external,
      lastUpdated: new Date().toISOString(),
    }
  } catch (err: unknown) {
    console.error('Failed to pre-fetch display stats on server:', err)
    return null
  }
}

/**
 * Painted immediately while the first stats snapshot streams in, so the display
 * screen shows its frame instead of a blank page.
 */
function DisplayLoadingFrame() {
  return (
    <div
      className="flex min-h-screen flex-col gap-6 bg-background p-6 sm:p-10"
      role="status"
      aria-label="Loading live display"
    >
      <div className="flex items-center justify-between border-b border-border/60 pb-5">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-72" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-2xl" />
        ))}
      </div>
      <span className="sr-only">Loading live statistics…</span>
    </div>
  )
}

async function LiveDisplayScreen() {
  const initialStats = await getInitialDisplayStats()
  return <LiveDisplay initialStats={initialStats} />
}

export default async function DisplayPage() {
  await requireAdminSession()

  return (
    <Suspense fallback={<DisplayLoadingFrame />}>
      <LiveDisplayScreen />
    </Suspense>
  )
}
