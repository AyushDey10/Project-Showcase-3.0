import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth/admin'
import { performFullSync } from '@/lib/sheets/sync'
import { processPendingSyncJobs } from '@/lib/sheets/queue'
import { checkSheetsConnection } from '@/lib/sheets/client'

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession()

    // Strict Super Admin Access Guard
    if (session.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Administrators can trigger Google Sheets synchronization.' },
        { status: 403 }
      )
    }

    const connection = await checkSheetsConnection()
    if (!connection.accessible) {
      return NextResponse.json(
        {
          error: connection.error || 'Cannot synchronize: Google Spreadsheet is not accessible.',
          errorCode: connection.errorCode,
          connection,
        },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action || 'FULL_SYNC'

    if (action === 'FULL_SYNC') {
      const result = await performFullSync()
      return NextResponse.json({
        success: true,
        message: `Successfully synchronized ${result.teamsCount} teams and ${result.studentsCount} students to Google Sheets.`,
        result,
      })
    }

    if (action === 'PROCESS_QUEUE') {
      const qResult = await processPendingSyncJobs(50)
      return NextResponse.json({
        success: true,
        message: `Processed ${qResult.processed} queue jobs (${qResult.succeeded} succeeded, ${qResult.failed} failed).`,
        result: qResult,
      })
    }

    return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Google Sheets synchronization failed.',
      },
      { status: 500 }
    )
  }
}
