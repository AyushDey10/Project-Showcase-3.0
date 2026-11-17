import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { processPendingSyncJobs } from '@/lib/sheets/queue'

export async function POST() {
  try {
    const session = await requireAdminSession()

    if (session.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Administrators can retry synchronization jobs.' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()

    // Reset failed jobs to pending with attempts = 0
    await supabase
      .from('sheets_sync_queue')
      .update({
        status: 'pending',
        attempts: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'failed')

    // Run queue processing
    const result = await processPendingSyncJobs(50)

    return NextResponse.json({
      success: true,
      message: `Retried sync queue: ${result.processed} processed, ${result.succeeded} succeeded, ${result.failed} failed.`,
      result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to retry synchronization jobs.',
      },
      { status: 500 }
    )
  }
}
