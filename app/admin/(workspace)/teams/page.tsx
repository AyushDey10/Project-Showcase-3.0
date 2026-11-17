import { Suspense } from 'react'
import type { Metadata } from 'next'
import { TeamsDirectory } from '@/components/admin/teams-directory'
import { PageLoading } from '@/components/admin/loading-state'

export const metadata: Metadata = {
  title: 'Team Directory — Project Showcase 3.0',
  robots: { index: false, follow: false },
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading teams directory..." />}>
      <TeamsDirectory />
    </Suspense>
  )
}
