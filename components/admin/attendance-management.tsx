'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ClipboardCheck,
  Fingerprint,
  FileCheck2,
  Search,
  X,
  RefreshCw,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Building2,
  Globe,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'
import { PageContainer } from '@/components/admin/page-container'
import { StatusBadge } from '@/components/admin/status-badge'
import { EmptyState } from '@/components/admin/empty-state'
import { ReportingLocationPopup } from '@/components/admin/reporting-location-popup'
import { Skeleton, SkeletonRow } from '@/components/ui/skeleton'
import {
  fetchTeamReportingLocation,
  type ReportingLocation,
} from '@/lib/teams/reporting-location'
import {
  CHECKPOINT_LABELS,
  getCheckpointProgress,
  isCheckpointApplicable,
} from '@/lib/teams/verification'
import { cn } from '@/lib/utils'

export type VerificationField = 'reported' | 'photo_id_checked' | 'noc_received'

export interface AttendanceTeam {
  id: string
  source_team_id: string
  team_name: string | null
  institution: string | null
  desk: 'internal' | 'external'
  project_title: string | null
  leader_name: string | null
  reported: boolean
  reported_at: string | null
  reported_by: string | null
  photo_id_checked: boolean
  photo_id_checked_at: string | null
  photo_id_checked_by: string | null
  noc_received: boolean
  noc_received_at: string | null
  noc_received_by: string | null
}

interface ReversalDialogState {
  isOpen: boolean
  team: AttendanceTeam | null
  field: VerificationField
  reason: string
}

/**
 * Checkpoint columns in workflow order:
 *   External: NOC Verification → Identity (ID Card) → Reported
 *   Internal: Identity (ID Card) → Reported (NOC shown as Not Required in mixed views)
 */
const CHECKPOINT_COLUMNS: { field: VerificationField; label: string }[] = [
  { field: 'noc_received', label: 'NOC Verification' },
  { field: 'photo_id_checked', label: 'Identity (ID Card)' },
  { field: 'reported', label: 'Reported' },
]

function formatTime(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Resolves the name shown for a team.
 * Most registered teams have no Team Name in the source data, so their
 * registered project title is used as the human-readable identifier.
 */
function getTeamDisplayName(team: Pick<AttendanceTeam, 'team_name' | 'project_title'>) {
  return team.team_name?.trim() || team.project_title?.trim() || 'Unnamed Team'
}

export function AttendanceManagement() {
  const [teams, setTeams] = useState<AttendanceTeam[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<'all' | 'internal' | 'external'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all')
  const [deskScope, setDeskScope] = useState<'all' | 'internal' | 'external'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 15

  // Action in-flight tracker: set of "teamId:field"
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set())

  // Reversal modal state
  const [reversalDialog, setReversalDialog] = useState<ReversalDialogState>({
    isOpen: false,
    team: null,
    field: 'reported',
    reason: '',
  })
  const [reversalSubmitting, setReversalSubmitting] = useState(false)
  const [reversalError, setReversalError] = useState<string | null>(null)

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 280)
    return () => clearTimeout(timer)
  }, [search])

  // Skeleton rows only on first visit; while a filter/page refetches, the
  // previous rows stay on screen so the table never collapses.
  const firstLoad = loading && teams.length === 0

  const fetchAttendance = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        q: debouncedSearch.trim(),
        category,
        status: statusFilter,
        page: String(page),
        pageSize: String(pageSize),
      })

      const res = await fetch(`/api/admin/teams?${params.toString()}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to load teams.')
      }

      const data = await res.json()
      setTeams(data.teams || [])
      setTotal(data.total || 0)
      if (data.deskScope && data.deskScope !== 'all') {
        setDeskScope(data.deskScope)
        setCategory(data.deskScope)
      } else {
        setDeskScope('all')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching attendance data.')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, category, statusFilter, page])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  // Reporting location popup: shown only after a Reported update succeeds
  const [locationPopup, setLocationPopup] = useState<{
    isOpen: boolean
    loading: boolean
    error: string | null
    team: AttendanceTeam | null
    location: ReportingLocation | null
  }>({ isOpen: false, loading: false, error: null, team: null, location: null })

  const closeLocationPopup = useCallback(() => {
    setLocationPopup({
      isOpen: false,
      loading: false,
      error: null,
      team: null,
      location: null,
    })
  }, [])

  const openReportingLocationPopup = async (team: AttendanceTeam) => {
    setLocationPopup({
      isOpen: true,
      loading: true,
      error: null,
      team,
      location: null,
    })

    try {
      const { location } = await fetchTeamReportingLocation(team.id)
      setLocationPopup((prev) =>
        prev.isOpen && prev.team?.id === team.id
          ? { ...prev, loading: false, error: null, location }
          : prev
      )
    } catch (err) {
      setLocationPopup((prev) =>
        prev.isOpen && prev.team?.id === team.id
          ? {
              ...prev,
              loading: false,
              error:
                err instanceof Error
                  ? err.message
                  : 'Could not load the reporting location.',
            }
          : prev
      )
    }
  }

  const executeVerification = async (
    teamId: string,
    field: VerificationField,
    newValue: boolean,
    reason?: string,
    team?: AttendanceTeam
  ) => {
    const actionKey = `${teamId}:${field}`
    if (pendingActions.has(actionKey)) return

    setPendingActions((prev) => new Set(prev).add(actionKey))

    try {
      const res = await fetch('/api/admin/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          fieldName: field,
          value: newValue,
          reason: reason || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update verification status.')
      }

      showToast(
        'success',
        newValue
          ? `${CHECKPOINT_LABELS[field]} verified successfully.`
          : `${CHECKPOINT_LABELS[field]} reversed successfully.`
      )

      // Only a successful Reported checkpoint opens the location popup.
      if (field === 'reported' && newValue && team) {
        void openReportingLocationPopup(team)
      }

      // Optimistically update local team state or refresh
      setTeams((prev) =>
        prev.map((t) => {
          if (t.id === teamId) {
            return {
              ...t,
              [field]: newValue,
              [`${field}_at`]: newValue ? new Date().toISOString() : null,
            }
          }
          return t
        })
      )
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update checkpoint.')
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev)
        next.delete(actionKey)
        return next
      })
    }
  }

  const handleCheckpointClick = (team: AttendanceTeam, field: VerificationField) => {
    const isCurrentlyChecked = team[field]
    if (isCurrentlyChecked) {
      // Initiate reversal with required reason dialog
      setReversalError(null)
      setReversalDialog({
        isOpen: true,
        team,
        field,
        reason: '',
      })
    } else {
      // Immediate verify
      executeVerification(team.id, field, true, undefined, team)
    }
  }

  const handleConfirmReversal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reversalDialog.team) return

    if (!reversalDialog.reason.trim()) {
      setReversalError('A reason or justification is required to reverse an attendance checkpoint.')
      return
    }

    setReversalSubmitting(true)
    setReversalError(null)

    try {
      await executeVerification(
        reversalDialog.team.id,
        reversalDialog.field,
        false,
        reversalDialog.reason.trim()
      )
      setReversalDialog({ isOpen: false, team: null, field: 'reported', reason: '' })
    } catch (err) {
      setReversalError(err instanceof Error ? err.message : 'Reversal failed.')
    } finally {
      setReversalSubmitting(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)
  // Internal desks only ever show the two internal checkpoints.
  const showNocColumn = deskScope !== 'internal'

  return (
    <PageContainer
      title="Attendance Management"
      description="Direct checkpoint operations — External teams: NOC Verification → Identity (ID Card) → Reported. Internal teams: Identity (ID Card) → Reported."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Attendance' },
      ]}
      actions={
        <div className="flex items-center gap-3">
          <StatusBadge
            type="desk"
            desk={deskScope}
            role={deskScope === 'all' ? 'super_admin' : 'admin'}
          />
          <button
            type="button"
            onClick={() => fetchAttendance()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      {/* Toast Alert */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2',
            toast.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-950/90 text-emerald-300'
              : 'border-rose-500/30 bg-rose-950/90 text-rose-300'
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Controls Card */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Team ID, Name, Institution, Leader..."
                className="w-full rounded-xl border border-input bg-background/60 py-2.5 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-cyan-500/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {deskScope === 'all' && (
                <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background/60 p-1 shrink-0">
                  {(
                    [
                      { id: 'all', label: 'All Teams' },
                      { id: 'internal', label: 'Internal' },
                      { id: 'external', label: 'External' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setCategory(t.id)
                        setPage(1)
                      }}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                        category === t.id
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background/60 p-1 shrink-0">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'not_started', label: 'Not Started' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(s.id)
                      setPage(1)
                    }}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                      statusFilter === s.id
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
            <div>
              {firstLoad ? (
                <Skeleton className="inline-block h-3 w-40 align-middle" />
              ) : (
                <>
                  <span className="font-medium text-foreground">{total} teams</span> found in current view
                  {loading && (
                    <span className="ml-2 text-[11px] text-cyan-400">Updating…</span>
                  )}
                </>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Click any checkpoint button to verify or reverse status
            </div>
          </div>
        </div>

        {/* Content Table / Cards — the real header row paints before data lands */}
        {firstLoad ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" aria-busy="true">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3.5 w-16">Team</th>
                    <th className="px-4 py-3.5">Details</th>
                    <th className="px-4 py-3.5">Desk</th>
                    {CHECKPOINT_COLUMNS.filter((column) => showNocColumn || column.field !== 'noc_received').map((column) => (
                      <th key={column.field} className="px-4 py-3.5 text-center whitespace-nowrap">
                        {column.label}
                      </th>
                    ))}
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <SkeletonRow key={`skeleton-${index}`} columns={showNocColumn ? 8 : 7} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-300">
            <AlertTriangle size={24} className="mx-auto mb-2 text-rose-400" />
            <p className="font-semibold text-sm">{error}</p>
            <button
              onClick={() => fetchAttendance()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold hover:bg-rose-500/30"
            >
              Retry
            </button>
          </div>
        ) : teams.length === 0 ? (
          <EmptyState
            iconName="clipboardCheck"
            title="No Teams Found"
            description="No teams match the active search or filter criteria."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3.5 w-16">Team</th>
                    <th className="px-4 py-3.5">Details</th>
                    <th className="px-4 py-3.5">Desk</th>
                    {CHECKPOINT_COLUMNS.filter((column) => showNocColumn || column.field !== 'noc_received').map((column) => (
                      <th key={column.field} className="px-4 py-3.5 text-center whitespace-nowrap">
                        {column.label}
                      </th>
                    ))}
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {teams.map((t) => {
                    // Class-specific completion: internal 2 checkpoints, external 3.
                    const progress = getCheckpointProgress(t.institution, t)
                    const isAllDone = progress.status === 'completed'

                    return (
                      <tr
                        key={t.id}
                        className={cn(
                          'group transition-colors hover:bg-muted/30',
                          isAllDone && 'bg-emerald-500/[0.02]'
                        )}
                      >
                        {/* Team ID */}
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-foreground">
                          {t.source_team_id}
                        </td>

                        {/* Name & Project */}
                        <td className="px-4 py-3.5 max-w-[240px]">
                          <div className="font-semibold text-foreground truncate" title={getTeamDisplayName(t)}>
                            {getTeamDisplayName(t)}
                          </div>
                          <div className="text-xs text-muted-foreground truncate" title={t.institution || ''}>
                            {t.institution || '—'}
                          </div>
                          {t.leader_name && (
                            <div className="text-[11px] text-muted-foreground/80 mt-0.5">
                              Leader: <span className="text-foreground/80">{t.leader_name}</span>
                            </div>
                          )}
                        </td>

                        {/* Desk */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StatusBadge type="category" category={t.desk} size="sm" />
                        </td>

                        {/* Workflow step 1: NOC Verification (external only) */}
                        {showNocColumn && (
                          <td className="px-3 py-3.5 text-center">
                            {isCheckpointApplicable(t.institution, 'noc_received') ? (
                              renderCheckpointButton(t, 'noc_received')
                            ) : (
                              <span
                                className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                                title="NOC Verification is not required for internal (Bennett University) teams."
                              >
                                Not Required
                              </span>
                            )}
                          </td>
                        )}

                        {/* Workflow step 2: Identity (ID Card) */}
                        <td className="px-3 py-3.5 text-center">
                          {renderCheckpointButton(t, 'photo_id_checked')}
                        </td>

                        {/* Workflow step 3: Reported */}
                        <td className="px-3 py-3.5 text-center">
                          {renderCheckpointButton(t, 'reported')}
                        </td>

                        {/* Overall Progress Badge */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
                              isAllDone
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : progress.completed > 0
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-muted text-muted-foreground border border-border'
                            )}
                          >
                            {progress.completed}/{progress.total}
                          </span>
                        </td>

                        {/* Detail Link */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/teams/${t.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                          >
                            <span>Inspect</span>
                            <ExternalLink size={12} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                <div>
                  Page <span className="font-semibold text-foreground">{page}</span> of{' '}
                  <span className="font-semibold text-foreground">{totalPages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft size={13} />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reversal Confirmation Dialog with Mandatory Reason */}
      {reversalDialog.isOpen && reversalDialog.team && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-base">Reverse Checkpoint</h3>
                <p className="text-xs text-muted-foreground">
                  Team {reversalDialog.team.source_team_id} &middot;{' '}
                  {CHECKPOINT_LABELS[reversalDialog.field].toUpperCase()}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              You are about to reverse the verified status for{' '}
              <strong className="text-foreground">{getTeamDisplayName(reversalDialog.team)}</strong>. Reversals
              create a permanent audit record and require an explanation.
            </p>

            {reversalError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {reversalError}
              </div>
            )}

            <form onSubmit={handleConfirmReversal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Reason for Reversal <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={reversalDialog.reason}
                  onChange={(e) => setReversalDialog((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Explain why this checkpoint is being reversed..."
                  rows={3}
                  required
                  className="w-full rounded-xl border border-input bg-background/60 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-rose-500/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={reversalSubmitting}
                  onClick={() =>
                    setReversalDialog({
                      isOpen: false,
                      team: null,
                      field: 'reported',
                      reason: '',
                    })
                  }
                  className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversalSubmitting || !reversalDialog.reason.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {reversalSubmitting && <RefreshCw size={12} className="animate-spin" />}
                  <span>Confirm Reversal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ReportingLocationPopup
        isOpen={locationPopup.isOpen}
        loading={locationPopup.loading}
        error={locationPopup.error}
        team={locationPopup.team}
        location={locationPopup.location}
        onClose={closeLocationPopup}
      />
    </PageContainer>
  )

  function renderCheckpointButton(team: AttendanceTeam, field: VerificationField) {
    const isChecked = team[field]
    const actionKey = `${team.id}:${field}`
    const isPending = pendingActions.has(actionKey)
    const timeStr = formatTime(team[`${field}_at` as keyof AttendanceTeam] as string | null)

    return (
      <div className="inline-flex flex-col items-center">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleCheckpointClick(team, field)}
          title={
            isChecked
              ? `${CHECKPOINT_LABELS[field]} verified. Click to reverse.`
              : `Click to mark ${CHECKPOINT_LABELS[field]} as verified`
          }
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all shadow-xs',
            isPending && 'opacity-60 cursor-not-allowed',
            isChecked
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-rose-500/15 hover:text-rose-400 hover:border-rose-500/30'
              : 'bg-muted/80 text-muted-foreground border border-border hover:bg-cyan-500/15 hover:text-cyan-400 hover:border-cyan-500/30'
          )}
        >
          {isPending ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : isChecked ? (
            <CheckCircle2 size={12} className="shrink-0" />
          ) : (
            <XCircle size={12} className="shrink-0 text-muted-foreground/60" />
          )}
          <span>{isChecked ? 'Done' : 'Mark'}</span>
        </button>
        {isChecked && timeStr && (
          <span className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
            {timeStr}
          </span>
        )}
      </div>
    )
  }
}
