'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Activity,
  ShieldCheck,
  Search,
  X,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  UserPlus,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
  Layers,
  Building2,
  Globe,
  MapPin,
} from 'lucide-react'
import { PageContainer } from '@/components/admin/page-container'
import { StatusBadge } from '@/components/admin/status-badge'
import { SkeletonTable } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/admin/empty-state'
import { ErrorState } from '@/components/admin/error-state'
import { cn } from '@/lib/utils'

export type VerificationActivityLog = {
  id: string
  event_no: number
  team_id: string
  team_name?: string | null
  source_team_id?: string | null
  institution?: string | null
  desk?: 'internal' | 'external'
  field_name: 'reported' | 'photo_id_checked' | 'noc_received' | string
  previous_value: boolean
  new_value: boolean
  admin_id: string | null
  admin_email: string | null
  admin_name?: string | null
  created_at: string
  reverse_log_id: string | null
  reason: string | null
}

export type AdminActivityLog = {
  id?: string
  created_at: string
  actor_id: string
  actor_email: string
  target_admin_id: string
  target_email: string
  action_type: 'CREATE' | 'INVITE' | 'ROLE_CHANGE' | 'DESK_CHANGE' | 'DEACTIVATE' | 'REACTIVATE' | string
  previous_role: string | null
  new_role: string | null
  reason: string | null
}

function formatDateTime(ts: string | null) {
  if (!ts) return '—'
  const date = new Date(ts)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function fieldDisplayName(f: string) {
  if (f === 'reported') return 'Reported'
  if (f === 'photo_id_checked') return 'Photo ID Checked'
  if (f === 'noc_received') return 'NOC Received'
  if (f === 'reporting_location') return 'Reporting Location'
  return f
}

function getVerificationActionType(
  log: VerificationActivityLog
): 'VERIFY' | 'REVERSE' | 'UNVERIFY' | 'LOCATION_UPDATE' {
  if (log.field_name === 'reporting_location') return 'LOCATION_UPDATE'
  if (log.new_value) return 'VERIFY'
  if (log.reverse_log_id || log.reason) return 'REVERSE'
  return 'UNVERIFY'
}

export function ActivityLog() {
  const [activeTab, setActiveTab] = useState<'verification' | 'admin'>('verification')
  const [verificationLogs, setVerificationLogs] = useState<VerificationActivityLog[]>([])
  const [adminLogs, setAdminLogs] = useState<AdminActivityLog[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(true)
  const [deskScope, setDeskScope] = useState<'all' | 'internal' | 'external'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [fieldFilter, setFieldFilter] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const fetchActivity = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/activity')
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Failed to load activity logs.')
      }
      const data = await res.json()
      setVerificationLogs(data.verificationActivity ?? [])
      setAdminLogs(data.adminActivity ?? [])
      setIsSuperAdmin(Boolean(data.isSuperAdmin))
      setDeskScope(data.deskScope ?? 'all')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch activity logs.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  // Reset page when tab or filters change
  useEffect(() => {
    setPage(1)
  }, [activeTab, searchQuery, actionFilter, fieldFilter, sortOrder])

  // Filtered Verification Logs
  const filteredVerificationLogs = useMemo(() => {
    return verificationLogs
      .filter((log) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const teamName = (log.team_name ?? '').toLowerCase()
          const sourceId = (log.source_team_id ?? '').toLowerCase()
          const email = (log.admin_email ?? '').toLowerCase()
          const reason = (log.reason ?? '').toLowerCase()
          const matches =
            teamName.includes(q) ||
            sourceId.includes(q) ||
            email.includes(q) ||
            reason.includes(q)
          if (!matches) return false
        }

        // Action Filter
        if (actionFilter !== 'all') {
          const actionType = getVerificationActionType(log)
          if (actionType !== actionFilter) return false
        }

        // Field Filter
        if (fieldFilter !== 'all') {
          if (log.field_name !== fieldFilter) return false
        }

        return true
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime()
        const timeB = new Date(b.created_at).getTime()
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
      })
  }, [verificationLogs, searchQuery, actionFilter, fieldFilter, sortOrder])

  // Filtered Admin Logs
  const filteredAdminLogs = useMemo(() => {
    return adminLogs
      .filter((log) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const target = (log.target_email ?? '').toLowerCase()
          const actor = (log.actor_email ?? '').toLowerCase()
          const reason = (log.reason ?? '').toLowerCase()
          const matches = target.includes(q) || actor.includes(q) || reason.includes(q)
          if (!matches) return false
        }

        // Action Filter
        if (actionFilter !== 'all') {
          if (log.action_type !== actionFilter) return false
        }

        return true
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime()
        const timeB = new Date(b.created_at).getTime()
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
      })
  }, [adminLogs, searchQuery, actionFilter, sortOrder])

  const totalItems =
    activeTab === 'verification' ? filteredVerificationLogs.length : filteredAdminLogs.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1

  const paginatedVerificationLogs = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredVerificationLogs.slice(start, start + pageSize)
  }, [filteredVerificationLogs, page, pageSize])

  const paginatedAdminLogs = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredAdminLogs.slice(start, start + pageSize)
  }, [filteredAdminLogs, page, pageSize])

  const handleResetFilters = () => {
    setSearchQuery('')
    setActionFilter('all')
    setFieldFilter('all')
    setSortOrder('desc')
    setPage(1)
  }

  const startRecord = totalItems > 0 ? (page - 1) * pageSize + 1 : 0
  const endRecord = Math.min(page * pageSize, totalItems)

  return (
    <PageContainer
      title="Activity Logs"
      description="Immutable audit trails for team verification decisions and administrator account modifications."
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Activity Logs' },
      ]}
      actions={
        <div className="flex items-center gap-3">
          <StatusBadge
            type="desk"
            desk={deskScope}
            role={isSuperAdmin ? 'super_admin' : 'admin'}
          />
          <button
            type="button"
            onClick={fetchActivity}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
            <span>Refresh Logs</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div className="flex gap-1.5 rounded-xl border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('verification')
                handleResetFilters()
              }}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all',
                activeTab === 'verification'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <Activity size={14} />
              <span>Verification Activity</span>
              <span className="rounded-full bg-muted/80 px-1.5 py-0.2 text-[10px] text-muted-foreground">
                {verificationLogs.length}
              </span>
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin')
                  handleResetFilters()
                }}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all',
                  activeTab === 'admin'
                    ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <ShieldCheck size={14} />
                <span>Admin Management Activity</span>
                <span className="rounded-full bg-muted/80 px-1.5 py-0.2 text-[10px] text-muted-foreground">
                  {adminLogs.length}
                </span>
              </button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {isSuperAdmin
              ? 'Showing events across all desks'
              : `Showing events for ${deskScope === 'internal' ? 'Internal Desk (Bennett)' : 'External Desk'}`}
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'verification'
                    ? 'Search by team name, team ID, admin email, or reason...'
                    : 'Search by target admin, actor email, or reason...'
                }
                className="w-full rounded-xl border border-input bg-background/60 py-2.5 pl-10 pr-9 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-cyan-500/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Action Type Filter */}
            <div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-xs text-foreground focus:border-cyan-500 focus:outline-none"
              >
                <option value="all">All Actions</option>
                {activeTab === 'verification' ? (
                  <>
                    <option value="VERIFY">VERIFY (Status Confirmed)</option>
                    <option value="REVERSE">REVERSE (Action Reversed)</option>
                    <option value="UNVERIFY">UNVERIFY (Status Cleared)</option>
                    <option value="LOCATION_UPDATE">
                      LOCATION_UPDATE (Reporting Location Changed)
                    </option>
                  </>
                ) : (
                  <>
                    <option value="CREATE">CREATE (Admin Created)</option>
                    <option value="INVITE">INVITE (Admin Invited)</option>
                    <option value="ROLE_CHANGE">ROLE_CHANGE (Role Updated)</option>
                    <option value="DESK_CHANGE">DESK_CHANGE (Desk Reassigned)</option>
                    <option value="DEACTIVATE">DEACTIVATE (Account Deactivated)</option>
                    <option value="REACTIVATE">REACTIVATE (Account Reactivated)</option>
                  </>
                )}
              </select>
            </div>

            {/* Field Filter (Verification tab only) OR Sort Order */}
            {activeTab === 'verification' ? (
              <div>
                <select
                  value={fieldFilter}
                  onChange={(e) => setFieldFilter(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-xs text-foreground focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">All Checkpoints</option>
                  <option value="reported">Reported</option>
                  <option value="photo_id_checked">Photo ID Checked</option>
                  <option value="noc_received">NOC Received</option>
                  <option value="reporting_location">Reporting Location</option>
                </select>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2.5 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <ArrowUpDown size={13} className="text-muted-foreground" />
                    <span>Order: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Active summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground pt-3 border-t border-border/60">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {totalItems} {totalItems === 1 ? 'event' : 'events'} found
              </span>
              {(searchQuery || actionFilter !== 'all' || fieldFilter !== 'all') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Reset all filters
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'verification' && (
                <button
                  type="button"
                  onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowUpDown size={12} />
                  <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
                </button>
              )}

              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-border bg-background px-2 py-0.5 text-xs text-foreground focus:border-cyan-500 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <ErrorState
            title="Failed to Load Activity Logs"
            message={error}
            onRetry={fetchActivity}
          />
        )}

        {/* Loading State — same table shell the log will occupy */}
        {loading && !error && (
          <SkeletonTable columns={9} rows={6} />
        )}

        {/* PART A: Verification Activity Table */}
        {!loading && !error && activeTab === 'verification' && (
          <>
            {filteredVerificationLogs.length === 0 ? (
              <EmptyState
                iconName="activity"
                title="No Verification Events Found"
                description={
                  searchQuery || actionFilter !== 'all' || fieldFilter !== 'all'
                    ? 'No verification logs match the selected filters or search query.'
                    : 'No verification events have been logged yet.'
                }
                action={
                  (searchQuery || actionFilter !== 'all' || fieldFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="rounded-xl border border-border bg-muted/80 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                      Clear search & filters
                    </button>
                  )
                }
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3.5 w-16 text-center">Event</th>
                        <th className="px-4 py-3.5">Team</th>
                        <th className="px-4 py-3.5">Desk</th>
                        <th className="px-4 py-3.5">Verification Field</th>
                        <th className="px-4 py-3.5 text-center">Change</th>
                        <th className="px-4 py-3.5">Action Type</th>
                        <th className="px-4 py-3.5">Admin Identity</th>
                        <th className="px-4 py-3.5">Timestamp</th>
                        <th className="px-4 py-3.5">Reversal Reason / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {paginatedVerificationLogs.map((log) => {
                        const actionType = getVerificationActionType(log)
                        return (
                          <tr key={log.id || log.event_no} className="group transition-colors hover:bg-muted/30">
                            {/* Event No */}
                            <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground text-center whitespace-nowrap">
                              #{log.event_no}
                            </td>

                            {/* Team */}
                            <td className="px-4 py-3.5 max-w-[220px]">
                              <Link
                                href={`/admin/teams/${log.team_id}`}
                                className="font-semibold text-foreground hover:text-cyan-400 transition-colors block truncate"
                                title={log.team_name ?? log.team_id}
                              >
                                {log.team_name || 'Team ' + log.team_id.slice(0, 8)}
                              </Link>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {log.source_team_id && (
                                  <span className="font-mono text-[11px] text-cyan-400 font-medium">
                                    {log.source_team_id}
                                  </span>
                                )}
                                {log.institution && (
                                  <span className="text-[11px] text-muted-foreground truncate max-w-[140px]" title={log.institution}>
                                    · {log.institution}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Desk */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <StatusBadge type="category" category={log.desk ?? 'external'} size="sm" />
                            </td>

                            {/* Field */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground border border-border">
                                {fieldDisplayName(log.field_name)}
                              </span>
                            </td>

                            {/* Change */}
                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                              {log.field_name === 'reporting_location' ? (
                                <span className="text-[11px] text-muted-foreground">
                                  Location updated
                                </span>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 text-xs font-mono">
                                  <span className={cn(log.previous_value ? 'text-emerald-400' : 'text-muted-foreground')}>
                                    {log.previous_value ? 'True' : 'False'}
                                  </span>
                                  <span className="text-muted-foreground/60">→</span>
                                  <span className={cn(log.new_value ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold')}>
                                    {log.new_value ? 'True' : 'False'}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Action Type */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {actionType === 'LOCATION_UPDATE' ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-400 border border-cyan-500/20">
                                  <MapPin size={12} />
                                  LOCATION UPDATE
                                </span>
                              ) : actionType === 'VERIFY' ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 size={12} />
                                  VERIFY
                                </span>
                              ) : actionType === 'REVERSE' ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-rose-400 border border-rose-500/20">
                                  <RotateCcw size={12} />
                                  REVERSE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border border-border">
                                  <XCircle size={12} />
                                  UNVERIFY
                                </span>
                              )}
                            </td>

                            {/* Admin */}
                            <td className="px-4 py-3.5 text-xs max-w-[190px]">
                              <div className="font-medium text-foreground truncate" title={log.admin_name || log.admin_email || 'System'}>
                                {log.admin_name || log.admin_email || 'System'}
                              </div>
                              {log.admin_email && log.admin_name && (
                                <div className="text-[11px] font-mono text-muted-foreground truncate" title={log.admin_email}>
                                  {log.admin_email}
                                </div>
                              )}
                            </td>

                            {/* Timestamp */}
                            <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                              {formatDateTime(log.created_at)}
                            </td>

                            {/* Reason */}
                            <td className="px-4 py-3.5 text-xs max-w-xs">
                              {log.reason ? (
                                <span className="italic text-rose-300/90 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 block truncate" title={log.reason}>
                                  {log.reason}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* PART B: Admin Management Activity Table */}
        {!loading && !error && activeTab === 'admin' && isSuperAdmin && (
          <>
            {filteredAdminLogs.length === 0 ? (
              <EmptyState
                iconName="shieldAlert"
                title="No Admin Account Events Found"
                description={
                  searchQuery || actionFilter !== 'all'
                    ? 'No administrator activity logs match your filter criteria.'
                    : 'No administrator management events have been recorded yet.'
                }
                action={
                  (searchQuery || actionFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="rounded-xl border border-border bg-muted/80 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                      Clear search & filters
                    </button>
                  )
                }
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3.5">Action Event</th>
                        <th className="px-4 py-3.5">Target Administrator</th>
                        <th className="px-4 py-3.5">Role / Desk Transition</th>
                        <th className="px-4 py-3.5">Performed By (Actor)</th>
                        <th className="px-4 py-3.5">Timestamp</th>
                        <th className="px-4 py-3.5">Audit Reason / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {paginatedAdminLogs.map((log, idx) => {
                        let actionBadge = null
                        if (log.action_type === 'CREATE') {
                          actionBadge = (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                              <UserPlus size={12} />
                              ADMIN CREATED
                            </span>
                          )
                        } else if (log.action_type === 'INVITE') {
                          actionBadge = (
                            <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-400 border border-cyan-500/20">
                              <UserPlus size={12} />
                              ADMIN INVITED
                            </span>
                          )
                        } else if (log.action_type === 'ROLE_CHANGE') {
                          actionBadge = (
                            <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-violet-400 border border-violet-500/20">
                              <ShieldCheck size={12} />
                              ROLE CHANGED
                            </span>
                          )
                        } else if (log.action_type === 'DESK_CHANGE') {
                          actionBadge = (
                            <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-400 border border-cyan-500/20">
                              <Layers size={12} />
                              DESK REASSIGNED
                            </span>
                          )
                        } else if (log.action_type === 'DEACTIVATE') {
                          actionBadge = (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-rose-400 border border-rose-500/20">
                              <ShieldAlert size={12} />
                              DEACTIVATED
                            </span>
                          )
                        } else if (log.action_type === 'REACTIVATE') {
                          actionBadge = (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 size={12} />
                              REACTIVATED
                            </span>
                          )
                        } else {
                          actionBadge = (
                            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground uppercase">
                              {log.action_type}
                            </span>
                          )
                        }

                        return (
                          <tr key={log.id ?? idx} className="group transition-colors hover:bg-muted/30">
                            {/* Action Type */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {actionBadge}
                            </td>

                            {/* Target Admin */}
                            <td className="px-4 py-3.5 font-mono text-xs text-foreground font-semibold">
                              {log.target_email}
                            </td>

                            {/* Role / Desk Transition */}
                            <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                              {log.action_type === 'ROLE_CHANGE' ? (
                                <div className="inline-flex items-center gap-1.5 font-medium">
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground capitalize">
                                    {log.previous_role?.replace('_', ' ') || 'None'}
                                  </span>
                                  <span className="text-muted-foreground/60">→</span>
                                  <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[11px] text-violet-400 font-semibold border border-violet-500/30 capitalize">
                                    {log.new_role?.replace('_', ' ')}
                                  </span>
                                </div>
                              ) : log.new_role ? (
                                <span className="rounded bg-muted px-2 py-0.5 text-[11px] text-foreground font-medium capitalize">
                                  {log.new_role.replace('_', ' ')}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>

                            {/* Actor */}
                            <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground truncate max-w-[180px]" title={log.actor_email}>
                              {log.actor_email}
                            </td>

                            {/* Timestamp */}
                            <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                              {formatDateTime(log.created_at)}
                            </td>

                            {/* Reason */}
                            <td className="px-4 py-3.5 text-xs max-w-xs">
                              {log.reason ? (
                                <span className="italic text-rose-300/90 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 block truncate" title={log.reason}>
                                  {log.reason}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Pagination Footer */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Showing <strong className="text-foreground">{startRecord}</strong> to{' '}
              <strong className="text-foreground">{endRecord}</strong> of{' '}
              <strong className="text-foreground">{totalItems}</strong> events
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={15} />
              </button>

              <span className="px-3 text-xs font-medium text-foreground">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
