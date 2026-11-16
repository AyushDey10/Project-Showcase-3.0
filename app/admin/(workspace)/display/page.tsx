import type { Metadata } from 'next'
import { LiveAttendanceDisplay } from '@/components/admin/live-attendance-display'
import { readTeamSource } from '@/lib/attendance/source'

export const metadata: Metadata = { title: 'Live attendance display' }

export default async function ProjectorAttendancePage() {
  const source = await readTeamSource()
  return <LiveAttendanceDisplay source={source} />
}
