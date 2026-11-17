import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ActivityLog } from '@/components/admin/activity-log'
import { PageLoading } from '@/components/admin/loading-state'

export const metadata: Metadata = {
  title: 'Activity Logs — Project Showcase 3.0',
  robots: { index: false, follow: false },
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading audit and activity logs..." />}>
      <ActivityLog />
    </Suspense>
  )
}
