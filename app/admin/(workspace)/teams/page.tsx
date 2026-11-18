import { Suspense } from 'react'
import type { Metadata } from 'next'
import { TeamsDirectory } from '@/components/admin/teams-directory'
import { PageLoadingSkeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Team Directory — Project Showcase 3.0',
  robots: { index: false, follow: false },
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton rows={10} columns={7} />}>
      <TeamsDirectory />
    </Suspense>
  )
}
