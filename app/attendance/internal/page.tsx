import type { Metadata } from 'next'
import { AttendancePortal } from '@/components/attendance/attendance-portal'

export const metadata: Metadata = {
  title: 'Internal team check-in',
  description: 'Bennett University internal team attendance check-in for Project Showcase 2026.',
}

export default function InternalAttendancePage() {
  return <AttendancePortal category="internal" />
}
