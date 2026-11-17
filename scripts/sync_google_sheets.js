/**
 * PROJECT SHOWCASE 3.0 — GOOGLE SHEETS CLI SYNC RUNNER
 * Usage: node scripts/sync_google_sheets.js
 */

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
  '1B0qfyQh2LDP0c_KeErYI1mNFYbjcjBGTCO200dXXtsE'

const SERVICE_EMAIL = (
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
  process.env.GOOGLE_CLIENT_EMAIL ||
  ''
).trim()

let PRIVATE_KEY = (
  process.env.GOOGLE_PRIVATE_KEY ||
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
  ''
).trim()

if (PRIVATE_KEY.includes('\\n')) {
  PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n')
}
if (
  (PRIVATE_KEY.startsWith('"') && PRIVATE_KEY.endsWith('"')) ||
  (PRIVATE_KEY.startsWith("'") && PRIVATE_KEY.endsWith("'"))
) {
  PRIVATE_KEY = PRIVATE_KEY.slice(1, -1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('====================================================================')
console.log('PROJECT SHOWCASE 3.0 — GOOGLE SHEETS SYNCHRONIZATION CLI')
console.log('====================================================================')
console.log(`Target Spreadsheet ID: ${SPREADSHEET_ID}`)
console.log(`Target Spreadsheet URL: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit\n`)

async function main() {
  if (!SERVICE_EMAIL || !PRIVATE_KEY) {
    console.error('ERROR: Google Service Account credentials not found in .env.local.')
    console.log('\nPlease add the following to your .env.local:')
    console.log('  GOOGLE_SHEETS_SPREADSHEET_ID=1B0qfyQh2LDP0c_KeErYI1mNFYbjcjBGTCO200dXXtsE')
    console.log('  GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"')
    console.log('  GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"')
    console.log('\nAlso ensure you shared the spreadsheet with the service account email as "Editor".')
    process.exit(1)
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Supabase credentials not found in .env.local.')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  })

  console.log('1. Fetching registration and attendance records from Supabase...')
  const [teamsRes, studentsRes, verifRes, adminsRes] = await Promise.all([
    supabase.from('teams').select('*').order('source_team_id', { ascending: true }),
    supabase.from('students').select('*').order('created_at', { ascending: true }),
    supabase.from('team_verifications').select('*'),
    supabase.from('admin_profiles').select('id, email, full_name, role'),
  ])

  if (teamsRes.error) {
    console.error('Failed to fetch teams:', teamsRes.error.message)
    process.exit(1)
  }

  const teams = teamsRes.data || []
  const students = studentsRes.data || []
  const verifications = verifRes.data || []
  const admins = adminsRes.data || []

  console.log(`   Retrieved: ${teams.length} teams, ${students.length} students, ${verifications.length} verifications.`)

  console.log('2. Authenticating with Google Sheets API...')
  const auth = new google.auth.JWT({
    email: SERVICE_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const sheets = google.sheets({ version: 'v4', auth })

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    console.log(`   Connected to: "${meta.data.properties?.title || 'Spreadsheet'}"`)
  } catch (err) {
    const code = err.code || err.status
    if (code === 403) {
      console.error(`\nPERMISSION ERROR (403): The spreadsheet has not been shared with ${SERVICE_EMAIL}.`)
      console.error(`Please open the spreadsheet in your browser, click Share, add "${SERVICE_EMAIL}" as Editor, and run again.`)
    } else {
      console.error('Google API Error:', err.message)
    }
    process.exit(1)
  }

  // Import dynamically from transformer
  const {
    TEAM_ATTENDANCE_HEADERS,
    STUDENT_DETAILS_HEADERS,
    ATTENDANCE_SUMMARY_HEADERS,
    buildAdminProfileMap,
    transformTeamAttendanceRow,
    transformStudentRow,
    transformAttendanceSummaryRow,
  } = await import('../lib/sheets/transformer.ts')

  const { ensureSpreadsheetTabs, buildFormattingRequests } = await import(
    '../lib/sheets/formatting.ts'
  )

  console.log('3. Ensuring required spreadsheet tabs exist...')
  const tabToId = await ensureSpreadsheetTabs(sheets, SPREADSHEET_ID)

  console.log('4. Formatting rows for all 3 tabs...')
  const adminMap = buildAdminProfileMap(admins)
  const verifMap = new Map()
  for (const v of verifications) verifMap.set(v.team_id, v)
  const teamMap = new Map()
  for (const t of teams) teamMap.set(t.id, t)

  const tab1Values = [
    TEAM_ATTENDANCE_HEADERS,
    ...teams.map((t) => transformTeamAttendanceRow(t, verifMap.get(t.id), adminMap)),
  ]
  const tab2Values = [
    STUDENT_DETAILS_HEADERS,
    ...students.map((s) => transformStudentRow(s, teamMap.get(s.team_id))),
  ]
  const tab3Values = [
    ATTENDANCE_SUMMARY_HEADERS,
    ...teams.map((t) => transformAttendanceSummaryRow(t, verifMap.get(t.id))),
  ]

  console.log('5. Writing data to Google Sheets via batch update...')
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `'Team Attendance'!A1`, values: tab1Values },
        { range: `'Student Details'!A1`, values: tab2Values },
        { range: `'Attendance Summary'!A1`, values: tab3Values },
      ],
    },
  })

  console.log('6. Applying header styling, frozen rows, filters, and conditional formatting...')
  const formattingRequests = buildFormattingRequests(tabToId)
  if (formattingRequests.length > 0) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: formattingRequests },
      })
    } catch (fmtErr) {
      console.warn('Formatting warning (non-fatal):', fmtErr.message)
    }
  }

  console.log('\n====================================================================')
  console.log('SYNCHRONIZATION COMPLETED SUCCESSFULLY!')
  console.log(`- Tab 1 (Team Attendance):   ${teams.length} team rows`)
  console.log(`- Tab 2 (Student Details):    ${students.length} student rows`)
  console.log(`- Tab 3 (Attendance Summary): ${teams.length} team rows`)
  console.log(`Spreadsheet URL: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`)
  console.log('====================================================================\n')
}

main().catch((err) => {
  console.error('Fatal sync error:', err)
  process.exit(1)
})
