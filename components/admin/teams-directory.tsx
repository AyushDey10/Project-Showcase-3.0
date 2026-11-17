'use client'

import React, { useState, useEffect, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  Search,
  X,
  Building2,
  Globe,
  ChevronLeft,
  ChevronRight,
  Users,
  ArrowRight,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Layers,
} from 'lucide-react'
import { PageContainer } from '@/components/admin/page-container'
import { StatusBadge } from '@/components/admin/status-badge'
import { LoadingSpinner, TableRowSkeleton } from '@/components/admin/loading-state'
import { EmptyState } from '@/components/admin/empty-state'
import { ErrorState } from '@/components/admin/error-state'
import { cn } from '@/lib/utils'

export type TeamDirectoryItem = {
  id: string
  source_team_id: string
  team_name: string
  institution: string | null
  project_title: string | null
  project_domain: string | null
  faculty_mentor: string | null
  team_size: number | null
  leader_name: string | null
  leader_enrollment_no: string | null
  leader_mobile: string | null
  leader_email: string | null
  reported: boolean
  photo_id_checked: boolean
  noc_received: boolean
}

export type CategoryFilter = 'all' | 'internal' | 'external'
export type AttendanceStatusFilter = 'all' | 'completed' | 'in_progress' | 'not_started'

export function TeamsDirectory() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize from URL search params
  const initialQuery = searchParams.get('q') ?? ''
  const initialCategory = (searchParams.get('category') as CategoryFilter) ?? 'all'
  const initialStatus = (searchParams.get('status') as AttendanceStatusFilter) ?? 'all'
  const initialPage = Math.max(1, Number(searchParams.get('page')) || 1)
  const initialPageSize = Math.min(100, Math.max(10, Number(searchParams.get('pageSize')) || 25))

  const [search, setSearch] = useState(initialQuery)
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery)
  const [category, setCategory] = useState<CategoryFilter>(
    ['all', 'internal', 'external'].includes(initialCategory) ? initialCategory : 'all'
  )
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusFilter>(
    ['all', 'completed', 'in_progress', 'not_started'].includes(initialStatus) ? initialStatus : 'all'
  )
  const [deskScope, setDeskScope] = useState<'all' | 'internal' | 'external'>('all')
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const [teams, setTeams] = useState<TeamDirectoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Sync state with URL without full page reload
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
    if (category !== 'all') params.set('category', category)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (page > 1) params.set('page', String(page))
    if (pageSize !== 25) params.set('pageSize', String(pageSize))

    const queryString = params.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname
    window.history.replaceState(null, '', newUrl)
  }, [debouncedSearch, category, statusFilter, page, pageSize, pathname])

  // Fetch teams from GET /api/admin/teams with cancellation support
  const fetchTeams = useCallback(async (signal?: AbortSignal) => {
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

      const res = await fetch(`/api/admin/teams?${params.toString()}`, { signal })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to load teams from server.')
      }

      const json = await res.json()
      setTeams(json.teams ?? [])
      setTotal(json.total ?? 0)
      if (json.deskScope && json.deskScope !== 'all') {
        setDeskScope(json.deskScope)
        setCategory(json.deskScope)
      } else {
        setDeskScope('all')
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return // Ignore intentional aborts
      }
      setError(err instanceof Error ? err.message : 'Could not fetch teams.')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, category, statusFilter, page, pageSize])

  useEffect(() => {
    const controller = new AbortController()
    fetchTeams(controller.signal)
    return () => {
      controller.abort()
    }
  }, [fetchTeams])

  const totalPages = Math.ceil(total / pageSize)
  const isInternal = (inst: string | null) =>
    Boolean(inst && inst.toLowerCase().includes('bennett'))

  const handleClearSearch = () => {
    setSearch('')
    setDebouncedSearch('')
    setPage(1)
  }

  const handleResetFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    if (deskScope === 'all') {
      setCategory('all')
    }
    setStatusFilter('all')
    setPage(1)
  }

  const startRecord = total > 0 ? (page - 1) * pageSize + 1 : 0
  const endRecord = Math.min(page * pageSize, total)

  return (
    <PageContainer
      title={
        deskScope === 'all'
          ? 'Team Directory'
          : `${deskScope === 'internal' ? 'Internal Desk' : 'External Desk'} Directory`
      }
      description={
        deskScope === 'all'
          ? 'Search and inspect all 130 participating teams across Bennett University and external institutions.'
          : `Teams assigned to the ${deskScope === 'internal' ? 'Bennett University (Internal)' : 'Other Institutions (External)'} desk.`
      }
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Teams' },
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
            onClick={() => fetchTeams()}
            disabled={loading}
            title="Refresh directory"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Search & Filter Controls Card */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search across Team ID, Name, Project, Institution, Leader, Students, Enrollments, Emails, Mentors..."
                className="w-full rounded-xl border border-input bg-background/60 py-2.5 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-cyan-500/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear search query"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category and Attendance Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter Tabs (Visible if Super Admin, or Locked Badge if Regular Admin) */}
              {deskScope === 'all' ? (
                <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background/60 p-1 self-start lg:self-auto shrink-0">
                  {(
                    [
                      { id: 'all', label: 'All Teams' },
                      { id: 'internal', label: 'Internal (BU)' },
                      { id: 'external', label: 'External' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setCategory(tab.id)
                        setPage(1)
                      }}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150',
                        category === tab.id
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-muted/40 text-xs">
                  <span className="text-muted-foreground">Desk Scope:</span>
                  <span className="font-semibold text-foreground capitalize">
                    {deskScope === 'internal' ? 'Bennett University Teams' : 'Other Institutions'}
                  </span>
                </div>
              )}

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-background/60 p-1 self-start lg:self-auto shrink-0">
                {(
                  [
                    { id: 'all', label: 'All Statuses' },
                    { id: 'completed', label: 'Completed (3/3)' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'not_started', label: 'Not Started' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.id)
                      setPage(1)
                    }}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150',
                      statusFilter === tab.id
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active filter summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground pt-3 border-t border-border/60">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">
                {total} {total === 1 ? 'team' : 'teams'} found
              </span>
              {debouncedSearch && (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground border border-border">
                  matching &ldquo;{debouncedSearch}&rdquo;
                </span>
              )}
              {category !== 'all' && deskScope === 'all' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground border border-border capitalize">
                  category: {category}
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground border border-border capitalize">
                  status: {statusFilter.replace('_', ' ')}
                </span>
              )}
              {(debouncedSearch || (category !== 'all' && deskScope === 'all') || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[11px] text-cyan-400 hover:underline ml-1 font-medium"
                >
                  Reset all filters
                </button>
              )}
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-cyan-500 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <ErrorState
            title="Failed to Load Teams"
            message={error}
            onRetry={() => fetchTeams()}
          />
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
              <LoadingSpinner size={16} />
              <span>Querying database records...</span>
            </div>
            <TableRowSkeleton columns={7} rows={8} />
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && teams.length === 0 && (
          <EmptyState
            iconName="users"
            title="No Teams Found"
            description={
              debouncedSearch || category !== 'all'
                ? 'No registered teams match the current search query and filters.'
                : 'No teams are registered in the showcase database.'
            }
            action={
              (debouncedSearch || (category !== 'all' && deskScope === 'all')) && (
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
        )}

        {/* Teams Table */}
        {!loading && !error && teams.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3.5 w-20">Team ID</th>
                    <th className="px-4 py-3.5">Team Name & Project</th>
                    <th className="px-4 py-3.5">Institution</th>
                    <th className="px-4 py-3.5">Leader</th>
                    <th className="px-4 py-3.5 text-center">Size</th>
                    <th className="px-4 py-3.5 text-center">Checkpoints</th>
                    <th className="px-4 py-3.5 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {teams.map((team) => {
                    const internal = isInternal(team.institution)
                    return (
                      <tr
                        key={team.id}
                        className="group transition-colors hover:bg-muted/30"
                      >
                        {/* Team ID */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                            {team.source_team_id}
                          </span>
                        </td>

                        {/* Team Name & Project */}
                        <td className="px-4 py-3.5 max-w-[280px]">
                          <Link
                            href={`/admin/teams/${team.id}`}
                            className="font-semibold text-foreground hover:text-cyan-400 transition-colors block truncate"
                            title={team.team_name}
                          >
                            {team.team_name}
                          </Link>
                          {team.project_title && (
                            <p
                              className="text-xs text-muted-foreground truncate mt-0.5"
                              title={team.project_title}
                            >
                              {team.project_title}
                            </p>
                          )}
                          {team.faculty_mentor && (
                            <span className="text-[11px] text-muted-foreground/70 block truncate mt-0.5">
                              Mentor: {team.faculty_mentor}
                            </span>
                          )}
                        </td>

                        {/* Institution */}
                        <td className="px-4 py-3.5 max-w-[220px]">
                          <div className="flex items-center gap-1.5">
                            <StatusBadge
                              type="category"
                              category={internal ? 'internal' : 'external'}
                              size="sm"
                            />
                          </div>
                          <span
                            className="block text-xs text-muted-foreground truncate mt-1"
                            title={team.institution ?? 'Not specified'}
                          >
                            {team.institution ?? '—'}
                          </span>
                        </td>

                        {/* Leader */}
                        <td className="px-4 py-3.5 max-w-[180px]">
                          <span className="font-medium text-foreground block truncate text-xs">
                            {team.leader_name ?? '—'}
                          </span>
                          {team.leader_enrollment_no && (
                            <span className="text-[11px] font-mono text-muted-foreground block truncate mt-0.5">
                              {team.leader_enrollment_no}
                            </span>
                          )}
                        </td>

                        {/* Team Size */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground">
                            <Users size={12} className="opacity-60" />
                            <span>{team.team_size ?? 1}</span>
                          </span>
                        </td>

                        {/* Verification Checkpoints (Reported, Photo ID, NOC) */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <StatusBadge
                              type="verification"
                              field="reported"
                              verified={team.reported}
                              label="Reported"
                              size="sm"
                            />
                            <StatusBadge
                              type="verification"
                              field="photo_id_checked"
                              verified={team.photo_id_checked}
                              label="Photo ID"
                              size="sm"
                            />
                            <StatusBadge
                              type="verification"
                              field="noc_received"
                              verified={team.noc_received}
                              label="NOC"
                              size="sm"
                            />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/teams/${team.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-400 shadow-xs"
                          >
                            <span>Inspect</span>
                            <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/80 px-4 py-3.5 text-xs text-muted-foreground bg-muted/10">
              <p>
                Showing <strong className="text-foreground">{startRecord}</strong> to{' '}
                <strong className="text-foreground">{endRecord}</strong> of{' '}
                <strong className="text-foreground">{total}</strong> teams
              </p>

              {totalPages > 1 && (
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

                  <span className="px-3 font-medium text-foreground">
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
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
