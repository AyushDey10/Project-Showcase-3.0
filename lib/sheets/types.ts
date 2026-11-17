export type DeskClassification = 'Internal' | 'External'

export interface SheetVolunteerInfo {
  id: string | null
  email: string | null
  fullName: string
}

export interface TeamAttendanceRow {
  teamId: string
  sourceTeamId: string
  teamName: string
  institution: string
  deskClassification: DeskClassification
  projectTitle: string
  projectDomain: string
  facultyMentor: string
  teamSize: number | ''
  leaderName: string
  leaderEnrollmentNo: string
  leaderMobile: string
  leaderEmail: string
  reportedStatus: 'Yes' | 'No'
  reportedTime: string
  reportedByVolunteer: string
  photoIdCheckedStatus: 'Yes' | 'No'
  photoIdCheckedTime: string
  photoIdCheckedByVolunteer: string
  nocReceivedStatus: 'Yes' | 'No'
  nocReceivedTime: string
  nocReceivedByVolunteer: string
  lastUpdated: string
  lastUpdatedBy: string
}

export interface StudentDetailsRow {
  teamId: string
  teamName: string
  institution: string
  deskClassification: DeskClassification
  studentName: string
  enrollmentNo: string
  mobileNo: string
  email: string
  studentRole: string
  studentId: string
}

export interface AttendanceSummaryRow {
  teamId: string
  teamName: string
  institution: string
  deskClassification: DeskClassification
  reported: 'Yes' | 'No'
  photoIdChecked: 'Yes' | 'No'
  nocReceived: 'Yes' | 'No'
  completedCheckpoints: number
  pendingCheckpoints: number
  totalCheckpoints: number
  completionPercentage: string
  lastUpdated: string
}

export interface SheetsSyncJob {
  id?: string
  entityType: 'team' | 'student' | 'verification' | 'full_sync'
  entityId?: string | null
  action: 'UPSERT' | 'DELETE' | 'FULL_SYNC'
  payload?: Record<string, unknown>
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  attempts?: number
  errorMessage?: string | null
  createdAt?: string
  completedAt?: string | null
}

export interface SheetsConnectionStatus {
  configured: boolean
  hasCredentials: boolean
  hasEmail: boolean
  hasKey: boolean
  hasSpreadsheetId: boolean
  spreadsheetId: string
  spreadsheetUrl: string
  serviceAccountEmail?: string
  accessible: boolean
  sheetTitle?: string
  tabsFound?: string[]
  error?: string
  errorCode?: 'MISSING_CREDENTIALS' | 'AUTH_FAILED' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 'UNKNOWN'
}

export interface SheetsSyncSummary {
  lastFullSync: string | null
  lastSuccessfulSync: string | null
  totalSyncedTeams: number
  totalSyncedStudents: number
  pendingJobs: number
  failedJobs: number
  status: 'idle' | 'syncing' | 'error'
  lastError?: string | null
}
