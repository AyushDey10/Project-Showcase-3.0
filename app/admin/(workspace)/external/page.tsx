import { AdminConsole } from '@/components/admin/admin-console'
import { readTeamSource } from '@/lib/attendance/source'

export default async function ExternalTeamsPage() {
  const source = await readTeamSource()
  return <AdminConsole source={source} view="external" />
}
