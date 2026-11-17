import 'server-only'
import { createAdminClient } from './admin'

export interface CachedTeamSummary {
  id: string
  source_team_id: string
  team_name: string | null
  institution: string | null
}

export interface CachedRegistrationData {
  teams: CachedTeamSummary[]
  teamMap: Map<string, CachedTeamSummary>
  totalStudents: number
  internalStudents: number
  externalStudents: number
  fetchedAt: number
}

let cachedData: CachedRegistrationData | null = null
let inFlightPromise: Promise<CachedRegistrationData> | null = null
const CACHE_TTL_MS = 60 * 1000 // 60 seconds

export async function getCachedRegistrationData(): Promise<CachedRegistrationData> {
  const now = Date.now()

  if (cachedData && now - cachedData.fetchedAt < CACHE_TTL_MS) {
    return cachedData
  }

  // Prevent multiple concurrent fetches from thundering herd
  if (inFlightPromise) {
    return inFlightPromise
  }

  inFlightPromise = (async () => {
    const supabase = createAdminClient()
    try {
      const [teamsRes, studentsRes] = await Promise.all([
        supabase
          .from('teams')
          .select('id, source_team_id, team_name, institution'),
        supabase
          .from('students')
          .select('id, team_id'),
      ])

      const teams = teamsRes.data ?? []
      const teamMap = new Map<string, CachedTeamSummary>(
        teams.map((t) => [t.id, t])
      )
      const students = studentsRes.data ?? []
      const totalStudents = students.length

      let internalStudents = 0
      let externalStudents = 0
      for (const s of students) {
        const team = teamMap.get(s.team_id)
        const inst = team?.institution?.toLowerCase() ?? ''
        if (inst.includes('bennett')) {
          internalStudents++
        } else {
          externalStudents++
        }
      }

      cachedData = {
        teams,
        teamMap,
        totalStudents,
        internalStudents,
        externalStudents,
        fetchedAt: Date.now(),
      }

      return cachedData
    } finally {
      inFlightPromise = null
    }
  })()

  return inFlightPromise
}

export function invalidateRegistrationCache(): void {
  cachedData = null
}
