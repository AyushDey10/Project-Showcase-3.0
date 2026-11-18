'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Users,
  GraduationCap,
  Clock,
  ArrowRight,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react'
import { PageContainer } from '@/components/admin/page-container'
import { LoadingSpinner } from '@/components/admin/loading-state'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'
import type { SheetsConnectionStatus, SheetsSyncSummary } from '@/lib/sheets/types'

export function SheetsSyncControl() {
  const [connection, setConnection] = useState<SheetsConnectionStatus | null>(null)
  const [summary, setSummary] = useState<SheetsSyncSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [copiedEmail, setCopiedEmail] = useState(false)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sheets/status')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch Google Sheets status.')
      }
      setConnection(data.connection)
      setSummary(data.summary)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleFullSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'FULL_SYNC' }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Full synchronization failed.')
      }
      showToast('success', data.message || 'Full synchronization completed successfully!')
      await fetchStatus()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  const handleRetryFailed = async () => {
    setRetrying(true)
    try {
      const res = await fetch('/api/admin/sheets/retry', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Retry failed.')
      }
      showToast('success', data.message || 'Retried failed synchronization jobs.')
      await fetchStatus()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Retry failed.')
    } finally {
      setRetrying(false)
    }
  }

  const handleCopyEmail = () => {
    if (connection?.serviceAccountEmail) {
      navigator.clipboard.writeText(connection.serviceAccountEmail)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2500)
    }
  }

  return (
    <PageContainer
      title="Google Sheets Attendance Sync"
      description="Real-time reporting and continuous attendance synchronization with Google Sheets."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Google Sheets' },
      ]}
      actions={
        <div className="flex items-center gap-2">
          {connection?.spreadsheetUrl && (
            <a
              href={connection.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
            >
              <FileSpreadsheet size={14} className="text-emerald-400" />
              <span>Open Spreadsheet</span>
              <ExternalLink size={12} className="text-muted-foreground" />
            </a>
          )}
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-medium shadow-2xl transition-all border backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30'
                : 'bg-rose-950/90 text-rose-200 border-rose-500/30'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* 1. Connection Banner */}
        {loading ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="size-11 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-3 w-72 max-w-full" />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          </div>
        ) : connection?.accessible ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">
                      {connection.sheetTitle || 'Google Spreadsheet Connected'}
                    </h3>
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/25">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Spreadsheet ID: <code className="text-foreground font-mono">{connection.spreadsheetId}</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFullSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
                >
                  {syncing ? <LoadingSpinner size={14} className="text-white" /> : <RefreshCw size={14} />}
                  <span>{syncing ? 'Synchronizing...' : 'Run Full Sync'}</span>
                </button>
              </div>
            </div>

            {connection.tabsFound && connection.tabsFound.length > 0 && (
              <div className="pt-3 border-t border-emerald-500/20 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Detected Tabs:</span>
                {connection.tabsFound.map((tab) => (
                  <span
                    key={tab}
                    className="rounded-lg bg-card/80 border border-border px-2.5 py-1 font-mono text-[11px] text-foreground"
                  >
                    {tab}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <ShieldAlert size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  {connection?.errorCode === 'MISSING_CREDENTIALS'
                    ? 'Google Cloud Service Account Not Configured'
                    : connection?.errorCode === 'PERMISSION_DENIED'
                    ? 'Spreadsheet Permission Required'
                    : 'Google Sheets Connection Pending'}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {connection?.error ||
                    'Google Sheets credentials or permissions need configuration in .env.local.'}
                </p>
              </div>
            </div>

            {connection?.serviceAccountEmail && (
              <div className="rounded-xl bg-card border border-border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Service Account Email:</span>
                  <code className="text-foreground font-mono text-xs">{connection.serviceAccountEmail}</code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  {copiedEmail ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. Sync Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Registered Teams</span>
              <Users size={16} className="text-cyan-400" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">130</p>
            <p className="text-[11px] text-muted-foreground">Single source of truth (Supabase)</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Registered Students</span>
              <GraduationCap size={16} className="text-indigo-400" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">434</p>
            <p className="text-[11px] text-muted-foreground">All linked to respective teams</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Pending Sync Jobs</span>
              <Clock size={16} className="text-amber-400" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {summary?.pendingJobs ?? 0}
            </p>
            <p className="text-[11px] text-muted-foreground">Queued updates for spreadsheet</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Failed Jobs</span>
              <XCircle size={16} className="text-rose-400" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {summary?.failedJobs ?? 0}
              </p>
              {(summary?.failedJobs ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={handleRetryFailed}
                  disabled={retrying}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                >
                  <RotateCcw size={12} />
                  <span>Retry</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Retried automatically with backoff</p>
          </div>
        </div>

        {/* 3. Three Required Spreadsheet Tabs Information */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Spreadsheet Tab Specifications</h2>
            <p className="text-xs text-muted-foreground">
              The Google Spreadsheet synchronizes all attendance information into three distinct tabs with frozen headers, automatic filters, and conditional styling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold text-cyan-400 font-mono">
                  TAB 1
                </span>
                <h4 className="text-sm font-semibold text-foreground">Team Attendance</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                1 row per team (130 teams). Contains Team ID, metadata, leader contact, and all 3 verification checkpoints with exact timestamps and resolved volunteer full names.
              </p>
              <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                Columns: <strong>24 fields</strong> · Frozen Row 1 · Auto-filter
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 font-mono">
                  TAB 2
                </span>
                <h4 className="text-sm font-semibold text-foreground">Student Details</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                1 row per student (434 students). Contains student name, enrollment number, contact info, role, and desk classification (Bennett = Internal; other = External).
              </p>
              <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                Columns: <strong>10 fields</strong> · Linked to Team ID
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 font-mono">
                  TAB 3
                </span>
                <h4 className="text-sm font-semibold text-foreground">Attendance Summary</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                1 row per team (130 teams). Live summary of completed, pending, and total checkpoints, completion percentage (0% to 100%), and last updated timestamp.
              </p>
              <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                Columns: <strong>12 fields</strong> · Percentage formatting
              </div>
            </div>
          </div>
        </section>

        {/* 4. Google Cloud Setup Guide */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Google Cloud Service Account Configuration Guide
            </h2>
            <p className="text-xs text-muted-foreground">
              Follow these standard steps to authorize continuous background synchronization.
            </p>
          </div>

          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-3 rounded-xl bg-background/50 border border-border/60 p-3.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 font-bold text-xs">
                1
              </span>
              <div className="space-y-1">
                <strong className="text-foreground block">Create Google Cloud Project & Service Account</strong>
                <span>
                  Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">Google Cloud Console</a>, create or select a project, navigate to <strong>IAM & Admin &gt; Service Accounts</strong>, and click <strong>Create Service Account</strong> (e.g. <code>project-showcase-sync</code>).
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-background/50 border border-border/60 p-3.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 font-bold text-xs">
                2
              </span>
              <div className="space-y-1">
                <strong className="text-foreground block">Enable Google Sheets API</strong>
                <span>
                  In <strong>APIs & Services &gt; Library</strong>, search for <strong>Google Sheets API</strong> and click <strong>Enable</strong>.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-background/50 border border-border/60 p-3.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 font-bold text-xs">
                3
              </span>
              <div className="space-y-1">
                <strong className="text-foreground block">Generate Service Account JSON Key</strong>
                <span>
                  Click on the created Service Account &gt; <strong>Keys</strong> tab &gt; <strong>Add Key</strong> &gt; <strong>Create New Key (JSON)</strong>. Download the key securely to your local machine.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-background/50 border border-border/60 p-3.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 font-bold text-xs">
                4
              </span>
              <div className="space-y-1">
                <strong className="text-foreground block">Share Spreadsheet with Service Account</strong>
                <span>
                  Open the Google Spreadsheet (<code>https://docs.google.com/spreadsheets/d/1B0qfyQh2LDP0c_KeErYI1mNFYbjcjBGTCO200dXXtsE/edit</code>), click <strong>Share</strong>, paste your Service Account email, set permission to <strong>Editor</strong>, and uncheck &quot;Notify people&quot;.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-background/50 border border-border/60 p-3.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 font-bold text-xs">
                5
              </span>
              <div className="space-y-1">
                <strong className="text-foreground block">Set Environment Variables in .env.local</strong>
                <span>
                  Add the following to <code>.env.local</code> (do not commit secrets to Git):
                </span>
                <pre className="mt-2 rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-slate-300 overflow-x-auto border border-slate-800">
{`GOOGLE_SHEETS_SPREADSHEET_ID=1B0qfyQh2LDP0c_KeErYI1mNFYbjcjBGTCO200dXXtsE
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  )
}
