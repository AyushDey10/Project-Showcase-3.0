import type { Metadata } from 'next'
import { AttendancePortal } from '@/components/attendance/attendance-portal'

export const metadata: Metadata = {
  title: 'External team check-in',
  description: 'External participants team attendance check-in for Project Showcase 2026.',
}

export default function ExternalAttendancePage() {
  return <AttendancePortal category="external" />
}
