import type { DeskClassification } from './types'

export function isInternalInstitution(institution: string | null | undefined): boolean {
  if (!institution) return false
  return institution.toLowerCase().includes('bennett')
}

export interface RawTeam {
  id: string
  source_team_id: string | null
  team_name: string | null
  institution: string | null
  project_title: string | null
  project_domain: string | null
  faculty_mentor: string | null
  team_size: number | null
  leader_name: string | null
  leader_enrollment_no: string | null
  leader_mobile: string | null
  leader_email: string | null
  created_at?: string
  updated_at?: string
}

export interface RawStudent {
  id: string
  team_id: string
  name: string
  enrollment_no: string | null
  mobile: string | null
  email: string | null
  role: string | null
  created_at?: string
}

export interface RawVerification {
  team_id: string
  reported: boolean
  reported_at: string | null
  reported_by: string | null
  photo_id_checked: boolean
  photo_id_checked_at: string | null
  photo_id_checked_by: string | null
  noc_received: boolean
  noc_received_at: string | null
  noc_received_by: string | null
  updated_at?: string | null
}

export interface RawAdminProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  desk: string | null
}

export const TEAM_ATTENDANCE_HEADERS = [
  'Team ID',
  'Source Team ID',
  'Team Name',
  'Institution',
  'Desk Classification',
  'Project Title',
  'Project Domain',
  'Faculty Mentor',
  'Team Size',
  'Leader Name',
  'Leader Enrollment Number',
  'Leader Mobile',
  'Leader Email',
  'Reported Status',
  'Reported Time',
  'Reported By Volunteer Name',
  'Identity (ID Card) Status',
  'Identity (ID Card) Time',
  'Identity (ID Card) By Volunteer Name',
  'NOC Verification Status (External only)',
  'NOC Verification Time',
  'NOC Verification By Volunteer Name',
  'Last Updated',
  'Last Updated By',
]

export const STUDENT_DETAILS_HEADERS = [
  'Team ID',
  'Team Name',
  'Institution',
  'Desk Classification',
  'Student Name',
  'Enrollment Number',
  'Mobile Number',
  'Email',
  'Student Role',
  'Student ID',
]

export const ATTENDANCE_SUMMARY_HEADERS = [
  'Team ID',
  'Team Name',
  'Institution',
  'Desk Classification',
  'Reported',
  'Identity (ID Card)',
  'NOC Verification (External only)',
  'Completed Checkpoints',
  'Pending Checkpoints',
  'Total Checkpoints (by team class)',
  'Completion Percentage',
  'Last Updated',
]

/**
 * Builds an admin lookup map using both UUID and lowercased email for instant resolution.
 */
export function buildAdminProfileMap(profiles: RawAdminProfile[]): Map<string, RawAdminProfile> {
  const map = new Map<string, RawAdminProfile>()
  for (const profile of profiles) {
    if (profile.id) {
      map.set(profile.id.toLowerCase(), profile)
    }
    if (profile.email) {
      map.set(profile.email.toLowerCase(), profile)
    }
  }
  return map
}

/**
 * Resolves volunteer name from an admin identifier (UUID or email).
 * Never returns a raw UUID, never invents a name.
 */
export function resolveVolunteerName(
  identifier: string | null | undefined,
  adminMap: Map<string, RawAdminProfile>
): string {
  if (!identifier || !identifier.trim()) {
    return ''
  }

  const key = identifier.trim().toLowerCase()
  const profile = adminMap.get(key)

  if (profile) {
    if (profile.full_name && profile.full_name.trim()) {
      return profile.full_name.trim()
    }
    if (profile.email) {
      return profile.email.trim()
    }
    return 'Admin'
  }

  // If the identifier itself is a readable email address, return the email or clean username
  if (identifier.includes('@')) {
    return identifier.trim()
  }

  // Never return raw UUIDs to the spreadsheet
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
  if (isUuid) {
    return 'Unknown Admin'
  }

  return identifier.trim() || 'Unknown Admin'
}

/**
 * Formats timestamps nicely for Google Sheets.
 */
export function formatSheetTimestamp(ts: string | null | undefined): string {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  } catch {
    return ''
  }
}

/**
 * Converts a raw team and verification record into a Row for Tab 1 (Team Attendance).
 */
export function transformTeamAttendanceRow(
  team: RawTeam,
  verification: RawVerification | undefined,
  adminMap: Map<string, RawAdminProfile>
): (string | number)[] {
  const isInternal = isInternalInstitution(team.institution)
  const desk: DeskClassification = isInternal ? 'Internal' : 'External'

  const reported = Boolean(verification?.reported)
  const photoIdChecked = Boolean(verification?.photo_id_checked)
  // NOC Verification applies to external teams only.
  const nocApplicable = !isInternal
  const nocReceived = nocApplicable && Boolean(verification?.noc_received)

  const reportedTime = reported ? formatSheetTimestamp(verification?.reported_at) : ''
  const reportedBy = reported ? resolveVolunteerName(verification?.reported_by, adminMap) : ''

  const photoIdTime = photoIdChecked ? formatSheetTimestamp(verification?.photo_id_checked_at) : ''
  const photoIdBy = photoIdChecked ? resolveVolunteerName(verification?.photo_id_checked_by, adminMap) : ''

  const nocTime = nocReceived ? formatSheetTimestamp(verification?.noc_received_at) : ''
  const nocBy = nocReceived ? resolveVolunteerName(verification?.noc_received_by, adminMap) : ''

  // Determine last update timestamp and updater across verifications and team
  const lastUpdatedTs = verification?.updated_at || team.updated_at || team.created_at || ''
  const lastUpdated = formatSheetTimestamp(lastUpdatedTs)

  // Last updater
  const lastUpdaterId =
    (nocApplicable ? verification?.noc_received_by : null) ||
    verification?.photo_id_checked_by ||
    verification?.reported_by
  const lastUpdatedBy = lastUpdaterId ? resolveVolunteerName(lastUpdaterId, adminMap) : 'System'

  return [
    team.id,
    team.source_team_id || '',
    team.team_name || '',
    team.institution || '',
    desk,
    team.project_title || '',
    team.project_domain || '',
    team.faculty_mentor || '',
    team.team_size ?? '',
    team.leader_name || '',
    team.leader_enrollment_no || '',
    team.leader_mobile || '',
    team.leader_email || '',
    reported ? 'Yes' : 'No',
    reportedTime,
    reportedBy,
    photoIdChecked ? 'Yes' : 'No',
    photoIdTime,
    photoIdBy,
    nocApplicable ? (nocReceived ? 'Yes' : 'No') : 'Not Required',
    nocTime,
    nocBy,
    lastUpdated,
    lastUpdatedBy,
  ]
}

/**
 * Converts a raw student into a Row for Tab 2 (Student Details).
 */
export function transformStudentRow(
  student: RawStudent,
  team: RawTeam | undefined
): (string | number)[] {
  const isInternal = isInternalInstitution(team?.institution)
  const desk: DeskClassification = isInternal ? 'Internal' : 'External'

  return [
    student.team_id,
    team?.team_name || '',
    team?.institution || '',
    desk,
    student.name || '',
    student.enrollment_no || '',
    student.mobile || '',
    student.email || '',
    student.role || 'Member',
    student.id,
  ]
}

/**
 * Converts a raw team and verification record into a Row for Tab 3 (Attendance Summary).
 */
export function transformAttendanceSummaryRow(
  team: RawTeam,
  verification: RawVerification | undefined
): (string | number)[] {
  const isInternal = isInternalInstitution(team.institution)
  const desk: DeskClassification = isInternal ? 'Internal' : 'External'

  const reported = Boolean(verification?.reported)
  const photoIdChecked = Boolean(verification?.photo_id_checked)
  // Internal workflow: Identity (ID Card) + Reported. External: + NOC Verification.
  const nocApplicable = !isInternal
  const nocReceived = nocApplicable && Boolean(verification?.noc_received)

  let completed = 0
  if (reported) completed++
  if (photoIdChecked) completed++
  if (nocReceived) completed++

  const total = nocApplicable ? 3 : 2
  const pending = total - completed
  const percentage = `${Math.round((completed / total) * 100 * 10) / 10}%`
  const lastUpdated = formatSheetTimestamp(verification?.updated_at || team.updated_at || team.created_at)

  return [
    team.id,
    team.team_name || '',
    team.institution || '',
    desk,
    reported ? 'Yes' : 'No',
    photoIdChecked ? 'Yes' : 'No',
    nocApplicable ? (nocReceived ? 'Yes' : 'No') : 'Not Required',
    completed,
    pending,
    total,
    percentage,
    lastUpdated,
  ]
}
