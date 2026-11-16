import type { Metadata } from 'next'
import { AdminConsole } from '@/components/admin/admin-console'
import { readTeamSource } from '@/lib/attendance/source'

export const metadata: Metadata = { title: 'Attendance overview', robots: { index: false, follow: false } }

export default async function AdminDashboardPage() {
  const source = await readTeamSource()
  return <AdminConsole source={source} view="overview" />
}
