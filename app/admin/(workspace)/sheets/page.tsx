import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAdminSession } from '@/lib/auth/admin'
import { SheetsSyncControl } from '@/components/admin/sheets-sync'

export const metadata: Metadata = {
  title: 'Google Sheets Attendance Sync — Project Showcase 3.0',
  robots: { index: false, follow: false },
}

export default async function GoogleSheetsSyncPage() {
  const session = await requireAdminSession()

  // Guard: Only Super Admins can access Google Sheets synchronization controls
  if (session.profile.role !== 'super_admin') {
    redirect('/admin')
  }

  return <SheetsSyncControl />
}
