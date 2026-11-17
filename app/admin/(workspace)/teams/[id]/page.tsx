import type { Metadata } from 'next'
import { TeamDetail } from '@/components/admin/team-detail'
import { requireAdminSession } from '@/lib/auth/admin'

export const metadata: Metadata = {
  title: 'Team Details — Project Showcase 3.0',
  robots: { index: false, follow: false },
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await requireAdminSession()

  return <TeamDetail teamId={id} currentAdmin={session.profile} />
}
