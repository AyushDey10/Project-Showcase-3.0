import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth/admin'
import { checkSheetsConnection } from '@/lib/sheets/client'
import { getSyncSummary } from '@/lib/sheets/sync'

export async function GET() {
  try {
    const session = await requireAdminSession()

    // Strict Super Admin Access Guard
    if (session.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Administrators can view Google Sheets configuration.' },
        { status: 403 }
      )
    }

    const [connection, summary] = await Promise.all([
      checkSheetsConnection(),
      getSyncSummary(),
    ])

    return NextResponse.json({
      connection,
      summary,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to retrieve Google Sheets status.',
      },
      { status: 500 }
    )
  }
}
