import { google, sheets_v4 } from 'googleapis'
import { getGoogleCredentials, getSpreadsheetId, getSpreadsheetUrl } from './config'
import type { SheetsConnectionStatus } from './types'

let cachedSheetsClient: sheets_v4.Sheets | null = null

export function getSheetsClient(): sheets_v4.Sheets {
  if (cachedSheetsClient) {
    return cachedSheetsClient
  }

  const { email, privateKey, hasCredentials } = getGoogleCredentials()

  if (!hasCredentials) {
    throw new Error(
      'Google service account credentials are not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local.'
    )
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    })

    const client = google.sheets({ version: 'v4', auth })
    cachedSheetsClient = client
    return client
  } catch (err) {
    throw new Error(
      `Failed to initialize Google Sheets client: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

/**
 * Resets the cached client so configuration changes take effect immediately.
 */
export function resetSheetsClientCache(): void {
  cachedSheetsClient = null
}

/**
 * Checks connection and permissions to the Google Spreadsheet.
 */
export async function checkSheetsConnection(): Promise<SheetsConnectionStatus> {
  const { email, privateKey, hasCredentials, spreadsheetId } = getGoogleCredentials()
  const spreadsheetUrl = getSpreadsheetUrl(spreadsheetId)

  if (!hasCredentials) {
    return {
      configured: false,
      hasCredentials: false,
      hasEmail: Boolean(email),
      hasKey: Boolean(privateKey),
      hasSpreadsheetId: Boolean(spreadsheetId),
      spreadsheetId,
      spreadsheetUrl,
      serviceAccountEmail: email || undefined,
      accessible: false,
      errorCode: 'MISSING_CREDENTIALS',
      error:
        'Google service account credentials missing in .env.local. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.',
    }
  }

  try {
    const sheets = getSheetsClient()
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties.title',
    })

    const title = response.data.properties?.title ?? 'Untitled Spreadsheet'
    const tabsFound = (response.data.sheets ?? [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t))

    return {
      configured: true,
      hasCredentials: true,
      hasEmail: true,
      hasKey: true,
      hasSpreadsheetId: true,
      spreadsheetId,
      spreadsheetUrl,
      serviceAccountEmail: email,
      accessible: true,
      sheetTitle: title,
      tabsFound,
    }
  } catch (error: unknown) {
    const err = error as { code?: number; status?: number; message?: string }
    const code = err.code || err.status
    const message = err.message || 'Unknown error occurred while contacting Google Sheets API.'

    let errorCode: SheetsConnectionStatus['errorCode'] = 'UNKNOWN'
    let friendlyError = message

    if (code === 403 || message.toLowerCase().includes('permission') || message.toLowerCase().includes('caller does not have permission')) {
      errorCode = 'PERMISSION_DENIED'
      friendlyError = `Permission denied (403): The Google Spreadsheet has not been shared with the service account email (${email}). Please open the Google Sheet, click Share, add "${email}" as an Editor, and click Send.`
    } else if (code === 404 || message.toLowerCase().includes('not found')) {
      errorCode = 'NOT_FOUND'
      friendlyError = `Spreadsheet not found (404): Check if the spreadsheet ID "${spreadsheetId}" is correct.`
    } else if (code === 401 || message.toLowerCase().includes('invalid jwt') || message.toLowerCase().includes('unauthorized')) {
      errorCode = 'AUTH_FAILED'
      friendlyError = 'Google authentication failed (401): The private key or service account email appears invalid.'
    }

    return {
      configured: true,
      hasCredentials: true,
      hasEmail: true,
      hasKey: true,
      hasSpreadsheetId: true,
      spreadsheetId,
      spreadsheetUrl,
      serviceAccountEmail: email,
      accessible: false,
      errorCode,
      error: friendlyError,
    }
  }
}
