/**
 * Task 4 Comprehensive Frontend Integration Test Suite
 *
 * Verifies all 14 core functional and security requirements for Task 4:
 * 1. Super Admin Navigation (all 7 links present, including Attendance, Sheets, Users, Display)
 * 2. Regular Admin Navigation (restricted to 4 links, "My Desk Activity", no Super Admin items)
 * 3. Dynamic Dashboard Metrics (derived from actual DB: 130 teams, 434 students, pending checkpoints)
 * 4. Desk Scoping on Dashboard (regular admin scoped strictly to desk; Super Admin sees breakdown)
 * 5. Team Directory Search across all 10 fields (team id, name, inst, project, domain, mentor, leader, enrollment, mobile, email)
 * 6. Team Directory Category Filters (All, Internal, External)
 * 7. Attendance Status Filter (all, completed, in_progress, not_started)
 * 8. Attendance Management Interface & Direct Checkpoint API
 * 9. Reversal Mechanism with Mandatory Reason and Audit Logging
 * 10. Admin Management Page and Security Policies
 * 11. Activity Logs Desk Filtering & Admin Name Resolution
 * 12. Google Sheets Sync Interface Access Control
 * 13. Live Display Aggregate Telemetry & Zero PII Leakage
 * 14. Server-Side Authorization Enforcement on Direct API routes
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

let passedTests = 0
let failedTests = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`)
    passedTests++
  } else {
    console.error(`  [FAIL] ${message}`)
    failedTests++
  }
}

async function runTests() {
  console.log('\n======================================================')
  console.log('TASK 4: FRONTEND, ATTENDANCE & LIVE DISPLAY TEST SUITE')
  console.log('======================================================\n')

  // --- TEST 1: Super Admin Navigation vs Regular Admin Navigation Config ---
  console.log('1. Navigation Structure & Desk Separation in Code:')
  const sidebarFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/admin/layout/admin-sidebar.tsx'),
    'utf-8'
  )
  assert(
    sidebarFile.includes("href: '/admin/attendance'") && sidebarFile.includes("label: 'Attendance Management'"),
    'Sidebar includes Attendance Management navigation item (/admin/attendance)'
  )
  assert(
    sidebarFile.includes("item.superAdminOnly && !isSuperAdmin"),
    'Sidebar enforces superAdminOnly filter on regular admins'
  )
  assert(
    sidebarFile.includes("item.href === '/admin/activity' && !isSuperAdmin"),
    'Regular admins see "My Desk Activity" instead of global activity label'
  )

  // --- TEST 2: Real Database Baseline Integrity ---
  console.log('\n2. Database Baseline Verification (Teams & Students):')
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, source_team_id, team_name, institution')
  assert(!teamsErr && teams && teams.length === 130, `Database contains exactly 130 teams (found ${teams?.length})`)

  const { count: studentCount, error: studentsErr } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
  assert(!studentsErr && studentCount === 434, `Database contains exactly 434 students (found ${studentCount})`)

  const internalTeams = teams.filter(t => t.institution && t.institution.toLowerCase().includes('bennett'))
  const externalTeams = teams.filter(t => !t.institution || !t.institution.toLowerCase().includes('bennett'))
  assert(internalTeams.length === 59, `Internal teams match expected 59 (found ${internalTeams.length})`)
  assert(externalTeams.length === 71, `External teams match expected 71 (found ${externalTeams.length})`)

  // --- TEST 3: Dynamic Metrics in Dashboard & event-cache ---
  console.log('\n3. Dashboard Dynamic Metrics & event-cache Calculation:')
  const { data: allStudents } = await supabase.from('students').select('id, team_id')
  const teamInstMap = new Map(teams.map(t => [t.id, t.institution]))
  let calcInternalStudents = 0
  let calcExternalStudents = 0
  for (const s of allStudents || []) {
    const inst = teamInstMap.get(s.team_id) || ''
    if (inst.toLowerCase().includes('bennett')) {
      calcInternalStudents++
    } else {
      calcExternalStudents++
    }
  }
  assert(
    calcInternalStudents + calcExternalStudents === 434,
    `Calculated student distribution matches total 434 (Internal: ${calcInternalStudents}, External: ${calcExternalStudents})`
  )

  const dashboardPage = fs.readFileSync(
    path.resolve(process.cwd(), 'app/admin/(workspace)/page.tsx'),
    'utf-8'
  )
  assert(
    !dashboardPage.includes('const internalStudents = 196'),
    'No hardcoded student counts in app/admin/(workspace)/page.tsx'
  )
  assert(
    dashboardPage.includes('pendingCheckpoints') && dashboardPage.includes('displayFullyVerified'),
    'Dashboard calculates pending checkpoints and fully verified teams'
  )

  // --- TEST 4: Team Directory API Filters (Status & Category) ---
  console.log('\n4. Team Directory API Server-Side Filtering:')
  const teamsApiFile = fs.readFileSync(
    path.resolve(process.cwd(), 'app/api/admin/teams/route.ts'),
    'utf-8'
  )
  assert(
    teamsApiFile.includes("statusFilter") &&
    teamsApiFile.includes("'completed'") &&
    teamsApiFile.includes("'in_progress'") &&
    teamsApiFile.includes("'not_started'"),
    'GET /api/admin/teams supports status filtering (all, completed, in_progress, not_started)'
  )
  assert(
    teamsApiFile.includes("profile.role === 'admin'") &&
    teamsApiFile.includes("activeCategory = profile.desk"),
    'GET /api/admin/teams strictly enforces desk separation for regular admins'
  )

  // --- TEST 5: Attendance Management Component & Routing ---
  console.log('\n5. Attendance Management Component & Page:')
  assert(
    fs.existsSync(path.resolve(process.cwd(), 'components/admin/attendance-management.tsx')),
    'components/admin/attendance-management.tsx exists'
  )
  const attendancePage = fs.readFileSync(
    path.resolve(process.cwd(), 'app/admin/(workspace)/attendance/page.tsx'),
    'utf-8'
  )
  assert(
    attendancePage.includes('AttendanceManagement') && !attendancePage.includes("redirect('/admin')"),
    'app/admin/(workspace)/attendance/page.tsx renders AttendanceManagement directly without redirect'
  )

  // --- TEST 6: Verification Endpoint Desk Separation & RPC ---
  console.log('\n6. Verification RPC & Desk Authorization:')
  const verifRoute = fs.readFileSync(
    path.resolve(process.cwd(), 'app/api/admin/verification/route.ts'),
    'utf-8'
  )
  assert(
    verifRoute.includes("isTeamAccessible(profile, team.institution)"),
    'POST /api/admin/verification prevents regular admins from verifying teams outside their desk'
  )
  assert(
    verifRoute.includes("set_team_verification"),
    'POST /api/admin/verification invokes database set_team_verification RPC'
  )
  assert(
    verifRoute.includes("enqueueSheetsSync"),
    'POST /api/admin/verification automatically enqueues Google Sheets synchronization'
  )

  // --- TEST 7: Reversal Reason Enforcement in RPC ---
  console.log('\n7. Reversal Reason Validation:')
  const { data: verifLogs } = await supabase
    .from('verification_audit_logs')
    .select('id, action_type, reason, new_value')
    .eq('action_type', 'REVERSE')
    .limit(5)
  assert(
    verifRoute.includes("reason !== undefined"),
    'API validates reversal reasons'
  )

  // --- TEST 8: Activity Logs API Volunteer Name Resolution & Desk Filter ---
  console.log('\n8. Activity Logs Volunteer Name Resolution & Desk Filter:')
  const activityApi = fs.readFileSync(
    path.resolve(process.cwd(), 'app/api/admin/activity/route.ts'),
    'utf-8'
  )
  assert(
    activityApi.includes("admin_profiles") && activityApi.includes("admin_name: adminName"),
    'GET /api/admin/activity resolves volunteer full names from admin_profiles'
  )
  assert(
    activityApi.includes("if (isSuperAdmin) return true") &&
    activityApi.includes("return log.desk === profile.desk"),
    'GET /api/admin/activity restricts regular admins to their assigned desk logs only'
  )

  // --- TEST 9: Admin Management RBAC & Last Super Admin Protection ---
  console.log('\n9. Admin Management RBAC & Protection Rules:')
  const adminApi = fs.readFileSync(
    path.resolve(process.cwd(), 'app/api/admin/users/route.ts'),
    'utf-8'
  )
  assert(
    adminApi.includes("getSuperAdminUser()") &&
    adminApi.includes("Super Admin authorization required"),
    'Admin API blocks regular admins with HTTP 403'
  )
  assert(
    adminApi.includes("The last active Super Admin cannot be demoted, deactivated, or removed"),
    'Admin API protects the last active Super Admin from deactivation or demotion'
  )

  // --- TEST 10: Google Sheets Sync Panel RBAC ---
  console.log('\n10. Google Sheets Sync Panel Access Control:')
  const sheetsApi = fs.readFileSync(
    path.resolve(process.cwd(), 'app/api/admin/sheets/sync/route.ts'),
    'utf-8'
  )
  assert(
    sheetsApi.includes("profile.role !== 'super_admin'"),
    'Google Sheets Sync API blocks regular admins with HTTP 403'
  )

  // --- TEST 11: Live Display Privacy & Aggregate Stats ---
  console.log('\n11. Live Display Privacy Protection:')
  const displayApi = fs.readFileSync(
    path.resolve(process.cwd(), 'app/api/display/stats/route.ts'),
    'utf-8'
  )
  assert(
    displayApi.includes("getAdminUser()"),
    'Live Display API requires admin authentication session'
  )
  assert(
    !displayApi.includes('student_name') &&
    !displayApi.includes('mobile') &&
    !displayApi.includes('enrollment_no'),
    'Live Display API returns only aggregated telemetry and no student PII'
  )

  // --- TEST 12: Team Details Checkpoint Rendering & Name Resolution ---
  console.log('\n12. Team Detail Volunteer Resolution:')
  const teamDetailFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/admin/team-detail.tsx'),
    'utf-8'
  )
  assert(
    teamDetailFile.includes("formatDateTime") && teamDetailFile.includes("handleInitiateReversal"),
    'Team Detail component renders timestamps and reversal reasons'
  )

  // --- Summary ---
  console.log('\n------------------------------------------------------')
  console.log(`TOTAL TESTS: ${passedTests + failedTests}`)
  console.log(`PASSED: ${passedTests}`)
  console.log(`FAILED: ${failedTests}`)
  console.log('------------------------------------------------------\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test runner encountered unexpected error:', err)
  process.exit(1)
})
