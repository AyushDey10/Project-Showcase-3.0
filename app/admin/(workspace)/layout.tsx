import type { Metadata } from 'next'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { requireAdminSession } from '@/lib/auth/admin'

export const metadata: Metadata = {
  title: 'Project Showcase 3.0 — Admin',
  robots: { index: false, follow: false },
}

export default async function AdminWorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAdminSession()
  return <AdminLayout session={session}>{children}</AdminLayout>
}
