import { createAdminClient } from '@/lib/supabase/admin'
import { getGoogleCredentials } from './config'
import { syncSingleTeam, performFullSync } from './sync'
import type { SheetsSyncJob } from './types'

/**
 * Enqueues a synchronization job into the database queue.
 * Safe fallback: if table does not exist or credentials are not yet configured,
 * it safely logs without crashing the caller.
 */
export async function enqueueSheetsSync(job: SheetsSyncJob): Promise<void> {
  const supabase = createAdminClient()

  try {
    await supabase.from('sheets_sync_queue').insert({
      entity_type: job.entityType,
      entity_id: job.entityId || null,
      action: job.action,
      payload: job.payload || {},
      status: 'pending',
      attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn(
      'Notice: Could not insert into sheets_sync_queue (table may not be created yet):',
      err instanceof Error ? err.message : String(err)
    )
  }

  // If credentials are configured, trigger background sync
  const { hasCredentials } = getGoogleCredentials()
  if (hasCredentials) {
    // Run asynchronously without awaiting to keep parent request snappy
    dispatchSyncJobAsync(job).catch((e) => {
      console.warn('Background sheets sync notice:', e instanceof Error ? e.message : String(e))
    })
  }
}

/**
 * Dispatches a single sync job immediately.
 */
async function dispatchSyncJobAsync(job: SheetsSyncJob): Promise<void> {
  try {
    if (job.action === 'FULL_SYNC') {
      await performFullSync()
    } else if (job.entityType === 'team' || job.entityType === 'verification') {
      if (job.entityId) {
        await syncSingleTeam(job.entityId)
      }
    } else if (job.entityType === 'student') {
      // Full sync or team sync to ensure consistency
      if (job.payload?.teamId && typeof job.payload.teamId === 'string') {
        await syncSingleTeam(job.payload.teamId)
      } else {
        await performFullSync()
      }
    }
  } catch (err) {
    console.warn('Error during background Google Sheets sync:', err instanceof Error ? err.message : String(err))
  }
}

/**
 * Processes pending jobs from the queue with automatic retry logic.
 */
export async function processPendingSyncJobs(limit: number = 20): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const supabase = createAdminClient()
  let processed = 0
  let succeeded = 0
  let failed = 0

  const { data: jobs, error } = await supabase
    .from('sheets_sync_queue')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lt('attempts', 5)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error || !jobs || jobs.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  for (const job of jobs) {
    processed++
    const newAttempts = (job.attempts || 0) + 1

    try {
      if (job.action === 'FULL_SYNC') {
        await performFullSync()
      } else if (job.entity_type === 'team' || job.entity_type === 'verification') {
        if (job.entity_id) {
          await syncSingleTeam(job.entity_id)
        }
      } else if (job.entity_type === 'student') {
        await performFullSync()
      }

      await supabase
        .from('sheets_sync_queue')
        .update({
          status: 'completed',
          attempts: newAttempts,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', job.id)

      succeeded++
    } catch (jobErr) {
      failed++
      const msg = jobErr instanceof Error ? jobErr.message : String(jobErr)
      await supabase
        .from('sheets_sync_queue')
        .update({
          status: 'failed',
          attempts: newAttempts,
          error_message: msg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    }
  }

  return { processed, succeeded, failed }
}
