import { redirect } from 'next/navigation'
import { requireAdminSession } from '@/lib/auth/admin'

export default async function SettingsPage() {
  const session = await requireAdminSession()

  if (session.profile.role === 'super_admin') {
    redirect('/admin/sheets')
  }

  redirect('/admin')
}
