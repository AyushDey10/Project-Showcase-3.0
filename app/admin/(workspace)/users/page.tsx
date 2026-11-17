import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { requireAdminSession } from '@/lib/auth/admin'
import { AdminUsers } from '@/components/admin/admin-users'

export const metadata: Metadata = {
  title: 'Admin Management — Project Showcase 3.0',
  robots: { index: false, follow: false },
}

export default async function AdminUsersPage() {
  const session = await requireAdminSession()

  if (session.profile.role !== 'super_admin') {
    redirect('/admin')
  }

  return <AdminUsers currentAdmin={session.profile} />
}
