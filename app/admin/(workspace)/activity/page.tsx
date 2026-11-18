import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ActivityLog } from '@/components/admin/activity-log'
import { PageLoadingSkeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Activity Logs — Project Showcase 3.0',
  robots: { index: false, follow: false },
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton rows={9} columns={6} />}>
      <ActivityLog />
    </Suspense>
  )
}
