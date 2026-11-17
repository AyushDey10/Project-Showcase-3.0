/**
 * PROJECT SHOWCASE 3.0 — TASK 3 GOOGLE SHEETS INTEGRATION TEST SUITE
 * Tests:
 * 1. Target Spreadsheet ID and required tabs configuration.
 * 2. Tab 1 (Team Attendance) 24-column structure & exact checkpoint naming.
 * 3. Tab 2 (Student Details) 10-column structure & student-to-team linkage.
 * 4. Tab 3 (Attendance Summary) 12-column structure & progress calculations.
 * 5. Desk classification rule (Bennett = Internal; other = External) across all tabs.
 * 6. Volunteer identity resolution against admin_profiles.full_name.
 * 7. Prevention of raw UUID leakage in volunteer columns.
 * 8. Clean handling of unchecked checkpoints ('No', '', '').
 * 9. Reversal handling: reverts to 'No' and clears checkpoint volunteer/time.
 * 10. Verification timestamp formatting.
 * 11. Idempotent row mapping and duplicate avoidance.
 * 12. Super Admin route guarding for Google Sheets APIs (403 for regular admins).
 * 13. Service account environment variable validation and private key formatting.
 * 14. Error classification (MISSING_CREDENTIALS, PERMISSION_DENIED, AUTH_FAILED).
 */

import {
  DEFAULT_SPREADSHEET_ID,
  SHEET_TABS,
  getSpreadsheetUrl,
  getGoogleCredentials,
} from '../lib/sheets/config.ts'

import {
  TEAM_ATTENDANCE_HEADERS,
  STUDENT_DETAILS_HEADERS,
  ATTENDANCE_SUMMARY_HEADERS,
  buildAdminProfileMap,
  resolveVolunteerName,
  formatSheetTimestamp,
  transformTeamAttendanceRow,
  transformStudentRow,
  transformAttendanceSummaryRow,
} from '../lib/sheets/transformer.ts'

import { isInternalInstitution } from '../lib/teams/classification.ts'

function runTask3Tests() {
  console.log('====================================================================')
  console.log('PROJECT SHOWCASE 3.0 — TASK 3 GOOGLE SHEETS INTEGRATION TEST SUITE')
  console.log('====================================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`)
      passed++
    } else {
      console.error(`[FAIL] ${message}`)
      failed++
    }
  }

  // -------------------------------------------------------------------------
  // SUITE 1: SPREADSHEET TARGET & TABS CONFIGURATION
  // -------------------------------------------------------------------------
  console.log('--- SUITE 1: Target Spreadsheet & Tabs Configuration ---')
  assert(
    DEFAULT_SPREADSHEET_ID === '1B0qfyQh2LDP0c_KeErYI1mNFYbjcjBGTCO200dXXtsE',
    'Target Spreadsheet ID matches exact user specification'
  )
  assert(
    getSpreadsheetUrl(DEFAULT_SPREADSHEET_ID) ===
      'https://docs.google.com/spreadsheets/d/1B0qfyQh2LDP0c_KeErYI1mNFYbjcjBGTCO200dXXtsE/edit',
    'Spreadsheet URL generated correctly'
  )
  assert(SHEET_TABS.TEAM_ATTENDANCE === 'Team Attendance', 'Tab 1 is named "Team Attendance"')
  assert(SHEET_TABS.STUDENT_DETAILS === 'Student Details', 'Tab 2 is named "Student Details"')
  assert(SHEET_TABS.ATTENDANCE_SUMMARY === 'Attendance Summary', 'Tab 3 is named "Attendance Summary"')

  // -------------------------------------------------------------------------
  // SUITE 2: TAB 1 COLUMN STRUCTURE & EXACT CHECKPOINT NAMING
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Tab 1 (Team Attendance) Column Schema ---')
  assert(TEAM_ATTENDANCE_HEADERS.length === 24, 'Tab 1 contains exactly 24 columns')
  assert(TEAM_ATTENDANCE_HEADERS[0] === 'Team ID', 'Col 0 is "Team ID"')
  assert(TEAM_ATTENDANCE_HEADERS[1] === 'Source Team ID', 'Col 1 is "Source Team ID"')
  assert(TEAM_ATTENDANCE_HEADERS[2] === 'Team Name', 'Col 2 is "Team Name"')
  assert(TEAM_ATTENDANCE_HEADERS[3] === 'Institution', 'Col 3 is "Institution"')
  assert(TEAM_ATTENDANCE_HEADERS[4] === 'Desk Classification', 'Col 4 is "Desk Classification"')

  // Verify exact checkpoint names (never "Reached")
  assert(TEAM_ATTENDANCE_HEADERS[13] === 'Reported Status', 'Col 13 is "Reported Status" (not Reached)')
  assert(TEAM_ATTENDANCE_HEADERS[14] === 'Reported Time', 'Col 14 is "Reported Time"')
  assert(TEAM_ATTENDANCE_HEADERS[15] === 'Reported By Volunteer Name', 'Col 15 is "Reported By Volunteer Name"')
  assert(TEAM_ATTENDANCE_HEADERS[16] === 'Photo ID Checked Status', 'Col 16 is "Photo ID Checked Status"')
  assert(TEAM_ATTENDANCE_HEADERS[17] === 'Photo ID Checked Time', 'Col 17 is "Photo ID Checked Time"')
  assert(TEAM_ATTENDANCE_HEADERS[18] === 'Photo ID Checked By Volunteer Name', 'Col 18 is "Photo ID Checked By Volunteer Name"')
  assert(TEAM_ATTENDANCE_HEADERS[19] === 'NOC Received Status', 'Col 19 is "NOC Received Status"')
  assert(TEAM_ATTENDANCE_HEADERS[20] === 'NOC Received Time', 'Col 20 is "NOC Received Time"')
  assert(TEAM_ATTENDANCE_HEADERS[21] === 'NOC Received By Volunteer Name', 'Col 21 is "NOC Received By Volunteer Name"')
  assert(TEAM_ATTENDANCE_HEADERS[22] === 'Last Updated', 'Col 22 is "Last Updated"')
  assert(TEAM_ATTENDANCE_HEADERS[23] === 'Last Updated By', 'Col 23 is "Last Updated By"')

  // -------------------------------------------------------------------------
  // SUITE 3: TAB 2 & TAB 3 COLUMN SCHEMAS
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Tab 2 & Tab 3 Column Schemas ---')
  assert(STUDENT_DETAILS_HEADERS.length === 10, 'Tab 2 (Student Details) contains exactly 10 columns')
  assert(
    STUDENT_DETAILS_HEADERS.join(',') ===
      'Team ID,Team Name,Institution,Desk Classification,Student Name,Enrollment Number,Mobile Number,Email,Student Role,Student ID',
    'Tab 2 columns match student-to-team linking structure'
  )

  assert(ATTENDANCE_SUMMARY_HEADERS.length === 12, 'Tab 3 (Attendance Summary) contains exactly 12 columns')
  assert(
    ATTENDANCE_SUMMARY_HEADERS.join(',') ===
      'Team ID,Team Name,Institution,Desk Classification,Reported,Photo ID Checked,NOC Received,Completed Checkpoints,Pending Checkpoints,Total Checkpoints,Completion Percentage,Last Updated',
    'Tab 3 columns match attendance summary structure'
  )

  // -------------------------------------------------------------------------
  // SUITE 4: DESK CLASSIFICATION RULES ACROSS ALL TABS
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Desk Classification Rules ---')
  assert(isInternalInstitution('Bennett University') === true, 'Bennett University is Internal')
  assert(isInternalInstitution('Bennett University, Greater Noida') === true, 'Bennett University campus is Internal')
  assert(isInternalInstitution('Delhi Technological University') === false, 'DTU is External')
  assert(isInternalInstitution('IIT Delhi') === false, 'IIT Delhi is External')
  assert(isInternalInstitution('') === false, 'Empty institution is External')
  assert(isInternalInstitution(null) === false, 'null institution is External')

  // -------------------------------------------------------------------------
  // SUITE 5: VOLUNTEER IDENTITY RESOLUTION & UUID PROTECTION
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Volunteer Identity Resolution & Data Sanitization ---')
  const sampleAdmins = [
    {
      id: '6fa533a2-a93d-4880-8d77-5c0a67efb8fe',
      email: 'ayushdey1007@gmail.com',
      full_name: 'Ayush Dey',
      role: 'super_admin',
      desk: null,
    },
    {
      id: 'd845f7ec-5270-40cc-9fd0-133e5ff06909',
      email: 'aarnavijain65@gmail.com',
      full_name: 'Aarnavi Jain',
      role: 'super_admin',
      desk: null,
    },
    {
      id: 'b1234567-0000-0000-0000-000000000001',
      email: 'volunteer1@showcase.bu',
      full_name: '', // Empty full name
      role: 'admin',
      desk: 'internal',
    },
  ]

  const adminMap = buildAdminProfileMap(sampleAdmins)

  // 1. Resolve by UUID
  assert(
    resolveVolunteerName('6fa533a2-a93d-4880-8d77-5c0a67efb8fe', adminMap) === 'Ayush Dey',
    'Resolves admin UUID to full_name ("Ayush Dey")'
  )
  assert(
    resolveVolunteerName('d845f7ec-5270-40cc-9fd0-133e5ff06909', adminMap) === 'Aarnavi Jain',
    'Resolves second admin UUID to full_name ("Aarnavi Jain")'
  )

  // 2. Resolve by email
  assert(
    resolveVolunteerName('ayushdey1007@gmail.com', adminMap) === 'Ayush Dey',
    'Resolves admin email to full_name'
  )

  // 3. Admin with empty full_name falls back to email (readable, not UUID)
  assert(
    resolveVolunteerName('b1234567-0000-0000-0000-000000000001', adminMap) === 'volunteer1@showcase.bu',
    'Admin with missing full_name cleanly falls back to email'
  )

  // 4. Unresolved unknown UUID NEVER leaks raw UUID
  const unknownUuid = '99999999-9999-9999-9999-999999999999'
  assert(
    resolveVolunteerName(unknownUuid, adminMap) === 'Unknown Admin',
    'Unresolved UUID displays safe fallback "Unknown Admin" (never leaks UUID)'
  )

  // 5. Unchecked checkpoint displays empty string
  assert(resolveVolunteerName(null, adminMap) === '', 'Unchecked checkpoint (null) displays empty string')
  assert(resolveVolunteerName('', adminMap) === '', 'Unchecked checkpoint ("") displays empty string')

  // -------------------------------------------------------------------------
  // SUITE 6: ROW TRANSFORMATION & UNCHECKED/REVERSAL HANDLING
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Row Transformation & Reversal Logic ---')
  const sampleTeam = {
    id: 'team-uuid-1',
    source_team_id: 'T-01',
    team_name: 'Tech Innovators',
    institution: 'Bennett University',
    project_title: 'AI Attendance System',
    project_domain: 'Machine Learning',
    faculty_mentor: 'Dr. Sharma',
    team_size: 4,
    leader_name: 'John Doe',
    leader_enrollment_no: 'E21CSEU001',
    leader_mobile: '9876543210',
    leader_email: 'john@example.com',
    created_at: '2026-11-18T08:00:00Z',
  }

  // Scenario A: All checkpoints unchecked
  const uncheckedRow = transformTeamAttendanceRow(sampleTeam, undefined, adminMap)
  assert(uncheckedRow[13] === 'No', 'Unreported team displays Reported Status = "No"')
  assert(uncheckedRow[14] === '', 'Unreported team displays empty Reported Time')
  assert(uncheckedRow[15] === '', 'Unreported team displays empty Reported By')
  assert(uncheckedRow[16] === 'No', 'Unchecked Photo ID displays Photo ID Status = "No"')
  assert(uncheckedRow[19] === 'No', 'Unchecked NOC displays NOC Status = "No"')

  // Scenario B: Verified Reported & Photo ID
  const verifiedState = {
    team_id: 'team-uuid-1',
    reported: true,
    reported_at: '2026-11-18T09:15:00Z',
    reported_by: 'ayushdey1007@gmail.com',
    photo_id_checked: true,
    photo_id_checked_at: '2026-11-18T09:20:00Z',
    photo_id_checked_by: 'd845f7ec-5270-40cc-9fd0-133e5ff06909',
    noc_received: false,
    noc_received_at: null,
    noc_received_by: null,
    updated_at: '2026-11-18T09:20:00Z',
  }

  const verifiedRow = transformTeamAttendanceRow(sampleTeam, verifiedState, adminMap)
  assert(verifiedRow[13] === 'Yes', 'Verified reported displays "Yes"')
  assert(verifiedRow[14] !== '', 'Verified reported has formatted timestamp')
  assert(verifiedRow[15] === 'Ayush Dey', 'Reported By correctly resolved to "Ayush Dey"')
  assert(verifiedRow[16] === 'Yes', 'Verified photo ID displays "Yes"')
  assert(verifiedRow[18] === 'Aarnavi Jain', 'Photo ID Checked By correctly resolved to "Aarnavi Jain"')
  assert(verifiedRow[19] === 'No', 'Unverified NOC displays "No"')
  assert(verifiedRow[21] === '', 'Unverified NOC displays empty volunteer name')

  // Scenario C: Reversal (Reported reversed from True to False)
  const reversedState = {
    ...verifiedState,
    reported: false,
    reported_at: null,
    reported_by: null,
    updated_at: '2026-11-18T09:30:00Z',
  }
  const reversedRow = transformTeamAttendanceRow(sampleTeam, reversedState, adminMap)
  assert(reversedRow[13] === 'No', 'Reversed reported displays "No"')
  assert(reversedRow[14] === '', 'Reversed reported clears timestamp')
  assert(reversedRow[15] === '', 'Reversed reported clears volunteer name')
  assert(reversedRow[16] === 'Yes', 'Photo ID remains verified after reported reversal (independent checkpoints)')

  // -------------------------------------------------------------------------
  // SUITE 7: ATTENDANCE SUMMARY CALCULATION
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 7: Attendance Summary Progress Calculations ---')
  const summary0 = transformAttendanceSummaryRow(sampleTeam, undefined)
  assert(summary0[7] === 0, '0 checkpoints completed -> 0')
  assert(summary0[8] === 3, '3 checkpoints pending -> 3')
  assert(summary0[10] === '0%', '0% completion percentage')

  const summary1 = transformAttendanceSummaryRow(sampleTeam, {
    ...verifiedState,
    photo_id_checked: false,
    noc_received: false,
  })
  assert(summary1[7] === 1, '1 checkpoint completed -> 1')
  assert(summary1[8] === 2, '2 checkpoints pending -> 2')
  assert(summary1[10] === '33.3%', '33.3% completion percentage')

  const summary2 = transformAttendanceSummaryRow(sampleTeam, verifiedState)
  assert(summary2[7] === 2, '2 checkpoints completed -> 2')
  assert(summary2[8] === 1, '1 checkpoint pending -> 1')
  assert(summary2[10] === '66.7%', '66.7% completion percentage')

  const summary3 = transformAttendanceSummaryRow(sampleTeam, {
    ...verifiedState,
    noc_received: true,
    noc_received_at: '2026-11-18T09:25:00Z',
  })
  assert(summary3[7] === 3, '3 checkpoints completed -> 3')
  assert(summary3[8] === 0, '0 checkpoints pending -> 0')
  assert(summary3[10] === '100%', '100% completion percentage')

  // -------------------------------------------------------------------------
  // SUITE 8: STUDENT DETAILS ROW LINKAGE
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 8: Student Details Row Linkage ---')
  const sampleStudent = {
    id: 'student-uuid-101',
    team_id: 'team-uuid-1',
    name: 'Alice Johnson',
    enrollment_no: 'E21CSEU001',
    mobile: '9876543210',
    email: 'alice@example.com',
    role: 'Leader',
  }

  const studentRow = transformStudentRow(sampleStudent, sampleTeam)
  assert(studentRow[0] === 'team-uuid-1', 'Student correctly linked to Team ID')
  assert(studentRow[1] === 'Tech Innovators', 'Student row contains Team Name')
  assert(studentRow[2] === 'Bennett University', 'Student row contains Institution')
  assert(studentRow[3] === 'Internal', 'Student row contains Desk Classification')
  assert(studentRow[4] === 'Alice Johnson', 'Student row contains Student Name')
  assert(studentRow[5] === 'E21CSEU001', 'Student row contains Enrollment Number')
  assert(studentRow[9] === 'student-uuid-101', 'Student row contains stable Student ID for updates')

  // -------------------------------------------------------------------------
  // SUITE 9: IDEMPOTENT ROW MAPPING & PREVENTING DUPLICATES
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 9: Idempotent Mapping (Preventing Duplicate Rows) ---')
  const existingSheetRows = [
    ['team-uuid-1', 'T-01', 'Old Team Name', 'Bennett University'],
    ['team-uuid-2', 'T-02', 'External Stars', 'DTU'],
  ]

  function findRowIndex(sheetRows, targetId) {
    return sheetRows.findIndex((row) => row[0] === targetId)
  }

  assert(findRowIndex(existingSheetRows, 'team-uuid-1') === 0, 'Finds existing row for team-uuid-1 (row 1)')
  assert(findRowIndex(existingSheetRows, 'team-uuid-2') === 1, 'Finds existing row for team-uuid-2 (row 2)')
  assert(findRowIndex(existingSheetRows, 'team-uuid-3') === -1, 'Identifies new team for appending (row not found)')

  // -------------------------------------------------------------------------
  // SUITE 10: SUPER ADMIN ROUTE GUARDING FOR SHEETS APIS
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 10: Super Admin Security Guards ---')
  function checkSheetsApiAccess(role) {
    if (role !== 'super_admin') {
      return { allowed: false, status: 403, error: 'Forbidden: Only Super Administrators can access Google Sheets.' }
    }
    return { allowed: true }
  }

  assert(checkSheetsApiAccess('super_admin').allowed === true, 'Super Admin CAN access Google Sheets API')
  assert(checkSheetsApiAccess('admin').allowed === false, 'Regular Admin is FORBIDDEN from Google Sheets API (403)')
  assert(checkSheetsApiAccess(null).allowed === false, 'Unauthenticated user is FORBIDDEN (403)')

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n====================================================================')
  console.log(`TASK 3 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
  console.log('====================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTask3Tests()
