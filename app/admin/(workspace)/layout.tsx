import type { Metadata } from 'next'
import { AdminFrame } from '@/components/admin/admin-frame'
import { requireAdmin } from '@/lib/auth/admin'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function AdminWorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdmin()
  return <AdminFrame email={user.email ?? 'Administrator'}>{children}</AdminFrame>
}
