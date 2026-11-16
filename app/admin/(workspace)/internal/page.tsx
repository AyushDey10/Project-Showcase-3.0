import { AdminConsole } from '@/components/admin/admin-console'
import { readTeamSource } from '@/lib/attendance/source'

export default async function InternalTeamsPage() {
  const source = await readTeamSource()
  return <AdminConsole source={source} view="internal" />
}
