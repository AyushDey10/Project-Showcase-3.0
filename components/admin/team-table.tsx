'use client'

import type { TeamCategory, TeamRecord } from '@/lib/attendance/source'
import { ExportButton } from '@/components/admin/export-button'
import { Search, ChevronLeft, ChevronRight, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'

export type AdminView = 'overview' | 'all' | 'internal' | 'external' | 'present' | 'absent' | 'settings'

const dateFormatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' })
const timeFormatter = new Intl.DateTimeFormat('en-IN', { timeStyle: 'short' })

export function TeamTable({ teams, view, configured }: { teams: TeamRecord[]; view: AdminView; configured: boolean }) {
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | TeamCategory>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'PRESENT' | 'ABSENT'>('all')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'team'>('newest')
  const [page, setPage] = useState(1)
  const pageSize = 8

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    const matches = teams.filter((team) => {
      const categoryMatches = view === 'internal' ? team.category === 'internal' : view === 'external' ? team.category === 'external' : categoryFilter === 'all' || team.category === categoryFilter
      const statusMatches = view === 'present' ? team.status === 'PRESENT' : view === 'absent' ? team.status === 'ABSENT' : statusFilter === 'all' || team.status === statusFilter
      const searchMatches = !search || [team.teamName, team.leaderName, team.leaderEmail, team.teamId].some((value) => value.toLowerCase().includes(search))
      return categoryMatches && statusMatches && searchMatches
    })
    return matches.sort((a, b) => sort === 'team' ? a.teamName.localeCompare(b.teamName) : sort === 'oldest' ? (a.checkedInAt ?? '').localeCompare(b.checkedInAt ?? '') : (b.checkedInAt ?? '').localeCompare(a.checkedInAt ?? ''))
  }, [teams, query, categoryFilter, statusFilter, view, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const title = view === 'internal' ? 'Internal teams' : view === 'external' ? 'External teams' : view === 'present' ? 'Present teams' : view === 'absent' ? 'Absent teams' : 'All registered teams'
  const currentScope = view === 'internal' || view === 'external' || view === 'present' || view === 'absent' ? view : 'filtered'

  return (
    <section className="rounded-2xl border border-[#e7e7e1] bg-white">
      <div className="flex flex-col gap-4 border-b border-[#ecece7] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 className="text-lg font-black tracking-[-.04em]">{title}</h2><p className="mt-1 text-xs text-[#777780]">{filtered.length.toLocaleString()} {filtered.length === 1 ? 'team' : 'teams'} in this view</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-1 sm:flex-none">
            <span className="sr-only">Search by team, leader, or Gmail</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#898991]" aria-hidden="true" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search teams…" className="h-9 w-full rounded-lg border border-[#e2e2dc] bg-[#fbfbf9] pl-9 pr-3 text-xs outline-none focus:border-[#7c3aed] sm:w-[220px]" />
          </label>
          {view !== 'internal' && view !== 'external' && <label><span className="sr-only">Filter by category</span><select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value as 'all' | TeamCategory); setPage(1) }} className="h-9 rounded-lg border border-[#e2e2dc] bg-white px-3 text-xs outline-none focus:border-[#7c3aed]"><option value="all">All categories</option><option value="internal">Internal</option><option value="external">External</option></select></label>}
          {view !== 'present' && view !== 'absent' && <label><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'all' | 'PRESENT' | 'ABSENT'); setPage(1) }} className="h-9 rounded-lg border border-[#e2e2dc] bg-white px-3 text-xs outline-none focus:border-[#7c3aed]"><option value="all">Any status</option><option value="PRESENT">Present</option><option value="ABSENT">Absent</option></select></label>}
          <label><span className="sr-only">Sort teams</span><select value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest' | 'team')} className="h-9 rounded-lg border border-[#e2e2dc] bg-white px-3 text-xs outline-none focus:border-[#7c3aed]"><option value="newest">Newest check-in</option><option value="oldest">Oldest check-in</option><option value="team">Team name A–Z</option></select></label>
          <ExportButton scope={currentScope} query={query} category={categoryFilter === 'all' ? '' : categoryFilter} status={statusFilter === 'all' ? '' : statusFilter} label="Export XLSX" />
        </div>
      </div>

      {pageRows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead><tr className="bg-[#fafaf8] text-[9px] font-black uppercase tracking-[.13em] text-[#85858d]">
              <th scope="col" className="px-4 py-3">#</th><th scope="col" className="px-4 py-3">Team / leader</th><th scope="col" className="px-4 py-3">Registered email</th><th scope="col" className="px-4 py-3">Category</th><th scope="col" className="px-4 py-3">Members</th><th scope="col" className="px-4 py-3">Attendance</th><th scope="col" className="px-4 py-3">Check-in</th>
            </tr></thead>
            <tbody>
              {pageRows.map((team, index) => <tr key={team.teamId} className="border-t border-[#eeeeea] align-top transition hover:bg-[#fcfcfa]">
                <td className="px-4 py-4 text-xs text-[#92929a]">{(currentPage - 1) * pageSize + index + 1}</td>
                <td className="px-4 py-4"><details className="group"><summary className="max-w-[220px] cursor-pointer list-none text-xs font-bold marker:hidden"><span className="flex items-center gap-2"><span className="truncate">{team.teamName || 'Unnamed team'}</span><span className="text-[9px] font-semibold text-[#9a9aa1] group-open:rotate-90">›</span></span><span className="mt-1 block text-[10px] font-normal text-[#777780]">{team.leaderName || 'Team leader'}</span></summary><div className="mt-2 max-w-[260px] rounded-lg bg-[#f5f5f2] p-2.5 text-[10px] leading-5 text-[#686871]"><span className="font-bold">Team ID:</span> {team.teamId}<br /><span className="font-bold">Members:</span> {team.memberNames.length ? team.memberNames.join(', ') : 'Names not available in source mapping'}</div></details></td>
                <td className="px-4 py-4 text-xs text-[#66666e]">{team.leaderEmail}</td>
                <td className="px-4 py-4"><CategoryBadge category={team.category} /></td>
                <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 text-xs text-[#62626a]"><UsersRound size={14} aria-hidden="true" />{team.totalMembers ?? '—'}</span></td>
                <td className="px-4 py-4"><StatusBadge status={team.status} /></td>
                <td className="px-4 py-4 text-[10px] text-[#777780]">{team.checkedInAt ? <>{dateFormatter.format(new Date(team.checkedInAt))}<br /><span className="mt-1 inline-block text-[#393940]">{timeFormatter.format(new Date(team.checkedInAt))}</span></> : '—'}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid min-h-[260px] place-items-center px-6 py-10 text-center">
          <div className="max-w-sm"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f0eef9] text-[#7c3aed]"><UsersRound size={20} aria-hidden="true" /></span><h3 className="mt-4 text-sm font-black">{configured ? 'No teams in this view' : 'Team records are not connected'}</h3><p className="mt-2 text-xs leading-5 text-[#777780]">{configured ? query ? 'Try a different search or clear your filters.' : 'There are no registered teams matching this view.' : 'Connect the existing registration table mapping in the project settings to load live records.'}</p></div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[#ecece7] px-4 py-3 sm:px-5">
        <p className="text-[10px] text-[#85858d]">Page {currentPage} of {pageCount}</p>
        <div className="flex gap-2"><button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous page" className="grid size-8 place-items-center rounded-lg border border-[#e4e4de] disabled:opacity-40"><ChevronLeft size={15} aria-hidden="true" /></button><button type="button" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} aria-label="Next page" className="grid size-8 place-items-center rounded-lg border border-[#e4e4de] disabled:opacity-40"><ChevronRight size={15} aria-hidden="true" /></button></div>
      </div>
    </section>
  )
}

export function CategoryBadge({ category }: { category: TeamCategory }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] ${category === 'internal' ? 'bg-[#eef5dc] text-[#4d5c18]' : 'bg-[#f0ebff] text-[#6040a4]'}`}>{category}</span>
}

export function StatusBadge({ status }: { status: 'PRESENT' | 'ABSENT' }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] ${status === 'PRESENT' ? 'bg-[#edf6d7] text-[#52621f]' : 'bg-[#f1f1ef] text-[#73737a]'}`}><span className={`size-1.5 rounded-full ${status === 'PRESENT' ? 'bg-[#81a81d]' : 'bg-[#aaaab0]'}`} />{status}</span>
}
