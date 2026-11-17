export const DEFAULT_SPREADSHEET_ID = '1B0qfyQh2LDP0c_KeErYI1mNFYbjcjBGTCO200dXXtsE'

export const SHEET_TABS = {
  TEAM_ATTENDANCE: 'Team Attendance',
  STUDENT_DETAILS: 'Student Details',
  ATTENDANCE_SUMMARY: 'Attendance Summary',
} as const

export function getSpreadsheetId(): string {
  return (
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
    process.env.SPREADSHEET_ID ||
    DEFAULT_SPREADSHEET_ID
  ).trim()
}

export function getSpreadsheetUrl(spreadsheetId: string = getSpreadsheetId()): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
}

export function getGoogleCredentials() {
  const email = (
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    ''
  ).trim()

  let privateKey = (
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    ''
  ).trim()

  if (privateKey) {
    // If the private key was stored with escaped newlines "\n", unescape them
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n')
    }
    // Remove surrounding quotes if present
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1)
    }
  }

  return {
    email,
    privateKey,
    hasCredentials: Boolean(email && privateKey),
    spreadsheetId: getSpreadsheetId(),
  }
}
