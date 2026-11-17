import { createAdminClient } from '@/lib/supabase/admin'
import { getSheetsClient } from './client'
import { getSpreadsheetId, SHEET_TABS } from './config'
import { ensureSpreadsheetTabs, buildFormattingRequests } from './formatting'
import {
  TEAM_ATTENDANCE_HEADERS,
  STUDENT_DETAILS_HEADERS,
  ATTENDANCE_SUMMARY_HEADERS,
  buildAdminProfileMap,
  transformTeamAttendanceRow,
  transformStudentRow,
  transformAttendanceSummaryRow,
  type RawTeam,
  type RawStudent,
  type RawVerification,
  type RawAdminProfile,
} from './transformer'
import type { SheetsSyncSummary } from './types'

export interface FullSyncResult {
  success: boolean
  teamsCount: number
  studentsCount: number
  syncedAt: string
  error?: string
}

/**
 * Performs a complete, idempotent full synchronization from Supabase to Google Sheets.
 * Populates all 130 teams, 434 students, attendance checkpoints, and formatting.
 */
export async function performFullSync(): Promise<FullSyncResult> {
  const supabase = createAdminClient()
  const spreadsheetId = getSpreadsheetId()

  // 1. Fetch complete registration and verification dataset from Supabase
  const [teamsRes, studentsRes, verifRes, adminsRes] = await Promise.all([
    supabase
      .from('teams')
      .select('*')
      .order('source_team_id', { ascending: true }),
    supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: true }),
    supabase.from('team_verifications').select('*'),
    supabase
      .from('admin_profiles')
      .select('id, email, full_name, role, desk'),
  ])

  if (teamsRes.error) {
    throw new Error(`Failed to fetch teams from Supabase: ${teamsRes.error.message}`)
  }
  if (studentsRes.error) {
    throw new Error(`Failed to fetch students from Supabase: ${studentsRes.error.message}`)
  }

  const teams = (teamsRes.data || []) as RawTeam[]
  const students = (studentsRes.data || []) as RawStudent[]
  const verifications = (verifRes.data || []) as RawVerification[]
  const admins = (adminsRes.data || []) as RawAdminProfile[]

  const adminMap = buildAdminProfileMap(admins)
  const verifMap = new Map<string, RawVerification>()
  for (const v of verifications) {
    verifMap.set(v.team_id, v)
  }

  const teamMap = new Map<string, RawTeam>()
  for (const t of teams) {
    teamMap.set(t.id, t)
  }

  // 2. Build rows for Tab 1 (Team Attendance)
  const tab1Values: (string | number)[][] = [
    TEAM_ATTENDANCE_HEADERS,
    ...teams.map((t) => transformTeamAttendanceRow(t, verifMap.get(t.id), adminMap)),
  ]

  // 3. Build rows for Tab 2 (Student Details)
  const tab2Values: (string | number)[][] = [
    STUDENT_DETAILS_HEADERS,
    ...students.map((s) => transformStudentRow(s, teamMap.get(s.team_id))),
  ]

  // 4. Build rows for Tab 3 (Attendance Summary)
  const tab3Values: (string | number)[][] = [
    ATTENDANCE_SUMMARY_HEADERS,
    ...teams.map((t) => transformAttendanceSummaryRow(t, verifMap.get(t.id))),
  ]

  // 5. Initialize Google Sheets client and ensure tabs exist
  const sheets = getSheetsClient()
  const tabToId = await ensureSpreadsheetTabs(sheets, spreadsheetId)

  // 6. Write values to all three tabs using batchUpdate
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: `'${SHEET_TABS.TEAM_ATTENDANCE}'!A1`,
          values: tab1Values,
        },
        {
          range: `'${SHEET_TABS.STUDENT_DETAILS}'!A1`,
          values: tab2Values,
        },
        {
          range: `'${SHEET_TABS.ATTENDANCE_SUMMARY}'!A1`,
          values: tab3Values,
        },
      ],
    },
  })

  // 7. Apply styling, frozen headers, filters and conditional formatting
  const formattingRequests = buildFormattingRequests(tabToId)
  if (formattingRequests.length > 0) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: formattingRequests,
        },
      })
    } catch (fmtErr) {
      console.warn('Formatting warning (non-fatal):', fmtErr instanceof Error ? fmtErr.message : String(fmtErr))
    }
  }

  const nowIso = new Date().toISOString()

  // 8. Update sync summary in database state table if available
  try {
    await supabase.from('sheets_sync_state').upsert(
      {
        key: 'sync_summary',
        value: {
          last_full_sync: nowIso,
          last_successful_sync: nowIso,
          total_synced_teams: teams.length,
          total_synced_students: students.length,
          status: 'idle',
        },
        updated_at: nowIso,
      },
      { onConflict: 'key' }
    )
  } catch {
    // Ignore if table not yet migrated
  }

  return {
    success: true,
    teamsCount: teams.length,
    studentsCount: students.length,
    syncedAt: nowIso,
  }
}

/**
 * Updates a single team row across Tab 1 and Tab 3 in place.
 * Matches existing rows using stable Team ID (Column A) to prevent duplicates.
 */
export async function syncSingleTeam(teamId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const spreadsheetId = getSpreadsheetId()

  const [teamRes, verifRes, adminsRes] = await Promise.all([
    supabase.from('teams').select('*').eq('id', teamId).maybeSingle(),
    supabase.from('team_verifications').select('*').eq('team_id', teamId).maybeSingle(),
    supabase.from('admin_profiles').select('id, email, full_name, role, desk'),
  ])

  if (!teamRes.data) return false

  const team = teamRes.data as RawTeam
  const verif = (verifRes.data || undefined) as RawVerification | undefined
  const admins = (adminsRes.data || []) as RawAdminProfile[]
  const adminMap = buildAdminProfileMap(admins)

  const tab1Row = transformTeamAttendanceRow(team, verif, adminMap)
  const tab3Row = transformAttendanceSummaryRow(team, verif)

  const sheets = getSheetsClient()

  // Find row index in Tab 1 (Team Attendance) by reading column A
  const tab1IdsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_TABS.TEAM_ATTENDANCE}'!A:A`,
  })

  const tab1Rows = tab1IdsRes.data.values || []
  const teamRowIndex = tab1Rows.findIndex((row) => row[0] === teamId)

  if (teamRowIndex !== -1) {
    // Row exists: update in place (1-based index)
    const rowNum = teamRowIndex + 1
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${SHEET_TABS.TEAM_ATTENDANCE}'!A${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [tab1Row] },
    })
  } else {
    // Append if not found
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_TABS.TEAM_ATTENDANCE}'!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [tab1Row] },
    })
  }

  // Update Tab 3 (Attendance Summary)
  const tab3IdsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_TABS.ATTENDANCE_SUMMARY}'!A:A`,
  })

  const tab3Rows = tab3IdsRes.data.values || []
  const summaryRowIndex = tab3Rows.findIndex((row) => row[0] === teamId)

  if (summaryRowIndex !== -1) {
    const rowNum = summaryRowIndex + 1
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${SHEET_TABS.ATTENDANCE_SUMMARY}'!A${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [tab3Row] },
    })
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_TABS.ATTENDANCE_SUMMARY}'!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [tab3Row] },
    })
  }

  return true
}

/**
 * Retrieves the synchronization summary and status.
 */
export async function getSyncSummary(): Promise<SheetsSyncSummary> {
  const supabase = createAdminClient()

  let lastFullSync: string | null = null
  let lastSuccessfulSync: string | null = null
  let totalTeams = 130
  let totalStudents = 434
  let pendingCount = 0
  let failedCount = 0

  try {
    const { data: stateData } = await supabase
      .from('sheets_sync_state')
      .select('value')
      .eq('key', 'sync_summary')
      .maybeSingle()

    if (stateData?.value) {
      const v = stateData.value as Record<string, unknown>
      lastFullSync = (v.last_full_sync as string) || null
      lastSuccessfulSync = (v.last_successful_sync as string) || null
      if (typeof v.total_synced_teams === 'number') totalTeams = v.total_synced_teams
      if (typeof v.total_synced_students === 'number') totalStudents = v.total_synced_students
    }
  } catch {
    // Ignore if table not yet migrated
  }

  try {
    const [pRes, fRes] = await Promise.all([
      supabase
        .from('sheets_sync_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('sheets_sync_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),
    ])
    pendingCount = pRes.count || 0
    failedCount = fRes.count || 0
  } catch {
    // Ignore if queue table not yet created
  }

  return {
    lastFullSync,
    lastSuccessfulSync,
    totalSyncedTeams: totalTeams,
    totalSyncedStudents: totalStudents,
    pendingJobs: pendingCount,
    failedJobs: failedCount,
    status: 'idle',
  }
}
