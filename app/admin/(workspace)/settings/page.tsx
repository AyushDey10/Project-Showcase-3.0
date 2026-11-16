import { AdminConsole } from '@/components/admin/admin-console'
import { readTeamSource } from '@/lib/attendance/source'

export default async function AdminSettingsPage() {
  const source = await readTeamSource()
  return <AdminConsole source={source} view="settings" />
}
