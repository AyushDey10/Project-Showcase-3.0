import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/auth/admin'

export default async function RootPage() {
  const user = await getAdminUser()
  if (user) {
    redirect('/admin')
  } else {
    redirect('/admin/login')
  }
}
