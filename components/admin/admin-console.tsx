'use client'

import { ExportButton } from '@/components/admin/export-button'
import { QrCodeCard } from '@/components/admin/qr-code-card'
import { CategoryBadge, StatusBadge, TeamTable, type AdminView } from '@/components/admin/team-table'
import type { TeamRecord, TeamSource } from '@/lib/attendance/source'
import { createClient } from '@/lib/supabase/client'
import { Activity, ArrowDownRight, ArrowUpRight, CircleAlert, Clock3, Download, Radio, UsersRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const titles: Record<AdminView, { title: string; description: string }> = {
  overview: { title: 'Attendance overview', description: 'A live view of Project Showcase team check-ins.' },
  all: { title: 'All teams', description: 'Search and manage registered teams across both categories.' },
  internal: { title: 'Internal teams', description: 'Bennett University teams registered for the showcase.' },
  external: { title: 'External teams', description: 'Teams joining from other colleges and universities.' },
  present: { title: 'Present teams', description: 'Teams checked in for Project Showcase.' },
  absent: { title: 'Absent teams', description: 'Registered teams not yet checked in.' },
  settings: { title: 'Attendance settings', description: 'QR access, data source status, and system controls.' },
}

export function AdminConsole({ source, view }: { source: TeamSource; view: AdminView }) {
  const router = useRouter()
  const [realtime, setRealtime] = useState<'off' | 'connecting' | 'live' | 'offline'>('off')
  const dataAvailable = source.configured && source.issue === null

  useEffect(() => {
    if (!source.configured || !source.tableName) return
    const supabase = createClient()
    setRealtime('connecting')
    const channel = supabase.channel('project-showcase-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: source.tableName }, () => router.refresh())
      .subscribe((status) => setRealtime(status === 'SUBSCRIBED' ? 'live' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'offline' : 'connecting'))
    return () => { void supabase.removeChannel(channel) }
  }, [router, source.configured, source.tableName])

  const stats = useMemo(() => summarize(source.teams), [source.teams])
  const { title, description } = titles[view]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-[#777780]"><span className="size-1.5 rounded-full bg-[#7c3aed]" /> Student Cabinet / Attendance</div><h1 className="text-3xl font-black tracking-[-.06em] sm:text-4xl">{title}</h1><p className="mt-2 text-sm text-[#777780]">{description}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {view !== 'settings' && <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e5e5df] bg-white px-3 text-[10px] font-semibold text-[#65656d]"><span className={`size-1.5 rounded-full ${realtime === 'live' ? 'bg-[#76a41b]' : realtime === 'offline' ? 'bg-[#dc6a5e]' : 'bg-[#aaaab0]'}`} />{realtime === 'live' ? 'Live updates on' : realtime === 'connecting' ? 'Connecting to live updates' : realtime === 'offline' ? 'Live updates unavailable' : 'Live data'}</div>}
          {view === 'overview' && <ExportButton scope="all" label="Export workbook" />}
        </div>
      </header>

      {source.issue && <SourceNotice source={source} />}

      {view === 'settings' ? <Settings source={source} /> : view === 'overview' ? <Overview source={source} stats={stats} /> : <TeamTable teams={source.teams} view={view} configured={dataAvailable} />}
    </div>
  )
}

function summarize(teams: TeamRecord[]) {
  const present = teams.filter((team) => team.status === 'PRESENT').length
  const internal = teams.filter((team) => team.category === 'internal')
  const external = teams.filter((team) => team.category === 'external')
  return {
    total: teams.length,
    present,
    absent: teams.length - present,
    rate: teams.length ? Math.round((present / teams.length) * 100) : 0,
    internal: { total: internal.length, present: internal.filter((team) => team.status === 'PRESENT').length },
    external: { total: external.length, present: external.filter((team) => team.status === 'PRESENT').length },
  }
}

function SourceNotice({ source }: { source: TeamSource }) {
  const details = source.issue === 'mapping_missing'
    ? `No public registration table mapping is configured. Missing project variables: ${source.missing.join(', ') || 'team table and field mappings'}.`
    : source.issue === 'credentials_missing'
      ? 'The server-only Supabase key is unavailable. Add a server-side key before enabling team data access.'
      : 'The configured team table could not be read. Check the table and column mapping and confirm its server-side permissions.'
  return <div role="status" className="flex items-start gap-3 rounded-2xl border border-[#f1d9a6] bg-[#fffaf0] p-4 text-[#76540c] sm:p-5"><CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><div><p className="text-xs font-black">Attendance data source needs setup</p><p className="mt-1 text-xs leading-5">{details} Existing team records have not been replaced or simulated.</p></div></div>
}

function Overview({ source, stats }: { source: TeamSource; stats: ReturnType<typeof summarize> }) {
  const available = source.issue === null && source.configured
  const recent = [...source.teams].filter((team) => team.checkedInAt).sort((a, b) => (b.checkedInAt ?? '').localeCompare(a.checkedInAt ?? '')).slice(0, 5)
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered teams" value={available ? stats.total.toLocaleString() : '—'} sub="Across both categories" icon={<UsersRound size={18} />} accent="lime" />
        <StatCard label="Teams present" value={available ? stats.present.toLocaleString() : '—'} sub="Attendance confirmed" icon={<Activity size={18} />} accent="violet" />
        <StatCard label="Teams absent" value={available ? stats.absent.toLocaleString() : '—'} sub="Not checked in yet" icon={<Clock3 size={18} />} accent="neutral" />
        <StatCard label="Attendance rate" value={available ? `${stats.rate}%` : '—'} sub="Present / registered" icon={<ArrowUpRight size={18} />} accent="violet" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-2xl border border-[#e7e7e1] bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-black tracking-[-.03em]">Category attendance</h2><p className="mt-1 text-xs text-[#777780]">Progress against registered teams</p></div><span className="grid size-9 place-items-center rounded-xl bg-[#f2efff] text-[#7042ce]"><Activity size={17} aria-hidden="true" /></span></div>
          <div className="mt-7 flex flex-col gap-6">
            <ProgressRow label="Internal teams" category="internal" present={stats.internal.present} total={stats.internal.total} active={available} />
            <ProgressRow label="External teams" category="external" present={stats.external.present} total={stats.external.total} active={available} />
          </div>
          <div className="mt-7 border-t border-[#eeeeea] pt-5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.1em] text-[#85858d]"><span>Present vs absent</span><span>{available ? `${stats.rate}% checked in` : 'Awaiting source'}</span></div>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[#efefec]" aria-label={available ? `${stats.present} present and ${stats.absent} absent` : 'Attendance data is not connected'}>
              <div className="h-full bg-[#c6f135] transition-[width]" style={{ width: `${available ? stats.rate : 0}%` }} /><div className="h-full bg-[#d8d3ea] transition-[width]" style={{ width: `${available ? 100 - stats.rate : 0}%` }} />
            </div>
            <div className="mt-3 flex gap-5 text-[10px] text-[#686871]"><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#a9ce39]" />Present</span><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#c9c3dc]" />Absent</span></div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-[#111116] p-5 text-white sm:p-6">
          <div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#c6f135]">Check-in display</p><h2 className="mt-2 text-xl font-black tracking-[-.04em]">On the floor</h2></div><Radio size={18} className="text-[#c6f135]" aria-hidden="true" /></div>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><span className="text-[9px] font-bold uppercase tracking-[.14em] text-white/45">Total present</span><p className="mt-2 text-4xl font-black tracking-[-.07em]">{available ? stats.present : '—'}</p></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><span className="text-[9px] font-bold uppercase tracking-[.14em] text-white/45">Internal / external</span><p className="mt-2 text-2xl font-black tracking-[-.05em]">{available ? `${stats.internal.present} / ${stats.external.present}` : '— / —'}</p></div>
          </div>
          <p className="mt-4 text-[10px] leading-5 text-white/45">{available ? 'Counts refresh when the source table publishes a Realtime event.' : 'Live counts appear after the registered-team data source is mapped.'}</p>
        </section>
      </div>

      <section className="rounded-2xl border border-[#e7e7e1] bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-[#ecece7] px-5 py-4"><div><h2 className="text-sm font-black">Latest check-ins</h2><p className="mt-1 text-[10px] text-[#85858d]">Most recent team confirmations</p></div><a href="/admin/present" className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6940c8] hover:underline">All present <ArrowDownRight size={13} aria-hidden="true" /></a></div>
        {recent.length ? <div className="divide-y divide-[#eeeeea]">{recent.map((team) => <div key={team.teamId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div className="min-w-[170px]"><p className="text-xs font-bold">{team.teamName}</p><p className="mt-1 text-[10px] text-[#85858d]">{team.leaderName} · {team.leaderEmail}</p></div><div className="flex items-center gap-3"><CategoryBadge category={team.category} /><StatusBadge status={team.status} /><span className="text-[10px] text-[#85858d]">{team.checkedInAt ? new Intl.DateTimeFormat('en-IN', { timeStyle: 'short' }).format(new Date(team.checkedInAt)) : '—'}</span></div></div>)}</div> : <div className="grid min-h-[150px] place-items-center px-6 text-center text-xs text-[#85858d]">{available ? 'No teams have checked in yet.' : 'Latest check-ins will appear here when a live team source is connected.'}</div>}
      </section>
    </>
  )
}

function StatCard({ label, value, sub, icon, accent }: { label: string; value: string; sub: string; icon: React.ReactNode; accent: 'lime' | 'violet' | 'neutral' }) {
  return <article className="rounded-2xl border border-[#e7e7e1] bg-white p-4 sm:p-5"><div className="flex items-start justify-between"><p className="text-[10px] font-bold text-[#777780]">{label}</p><span className={`grid size-9 place-items-center rounded-xl ${accent === 'lime' ? 'bg-[#f0f6dc] text-[#62721f]' : accent === 'violet' ? 'bg-[#f1edfc] text-[#7042ce]' : 'bg-[#f1f1ef] text-[#74747b]'}`}>{icon}</span></div><p className="mt-4 text-3xl font-black tracking-[-.07em]">{value}</p><p className="mt-1 text-[10px] text-[#8a8a91]">{sub}</p></article>
}

function ProgressRow({ label, category, present, total, active }: { label: string; category: 'internal' | 'external'; present: number; total: number; active: boolean }) {
  const percentage = total ? Math.round((present / total) * 100) : 0
  return <div><div className="mb-2 flex items-center justify-between gap-4"><div className="flex items-center gap-2"><CategoryBadge category={category} /><span className="text-xs font-semibold">{label}</span></div><span className="text-xs font-bold">{active ? `${present} / ${total}` : '—'}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#f0f0ed]"><div className={`h-full rounded-full transition-[width] ${category === 'internal' ? 'bg-[#b6db3d]' : 'bg-[#a78bfa]'}`} style={{ width: `${active ? percentage : 0}%` }} /></div><div className="mt-2 flex justify-between gap-4 text-[10px] text-[#85858d]"><span>{active ? `${present} present · ${total - present} absent` : '—'}</span><span className="font-semibold">{active ? `${percentage}% attendance` : '—'}</span></div></div>
}

function Settings({ source }: { source: TeamSource }) {
  return <div className="flex flex-col gap-5">
    <section className="rounded-2xl border border-[#e7e7e1] bg-white p-5 sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#7c3aed]">Attendance QR management</p><h2 className="mt-1 text-xl font-black tracking-[-.04em]">Two routes. One attendance desk.</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-[#777780]">Each code opens a category-specific mobile check-in. Print the matching code beside its category label.</p></div><div className="flex flex-wrap gap-2"><ExportButton scope="all" label="Export all attendance" /><ExportButton scope="internal" label="Internal teams" /><ExportButton scope="external" label="External teams" /></div></div><div className="mt-6 grid gap-4 lg:grid-cols-2"><QrCodeCard category="internal" /><QrCodeCard category="external" /></div></section>
    <section className="rounded-2xl border border-[#e7e7e1] bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#f1edfc] text-[#7042ce]"><Download size={17} aria-hidden="true" /></span><div><h2 className="text-sm font-black">Data source & controls</h2><p className="mt-1 text-[10px] text-[#777780]">Current team database status</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><SettingValue label="Event name" value="Project Showcase 2026" /><SettingValue label="Organizer" value="Student Cabinet · Bennett University" /><SettingValue label="Registration source" value={source.tableName ?? 'Not mapped'} /><SettingValue label="Connection" value={source.issue === null && source.configured ? 'Connected' : 'Needs setup'} /><SettingValue label="Admin corrections" value="Locked until audit log is configured" /><SettingValue label="Admin account access" value="Managed by Supabase Auth role" /><SettingValue label="Team registration changes" value="Not available in attendance portal" /></div>{source.issue === 'mapping_missing' && <p className="mt-4 rounded-xl bg-[#fffaf0] p-4 text-xs leading-5 text-[#76540c]">To connect the existing registration table, configure the table and column mapping variables listed in the attendance data source notice. No registration records or schema were created by this app.</p>}<p className="mt-4 text-[10px] leading-5 text-[#898991]">Attendance corrections require an immutable audit log. They remain disabled until the existing database is inspected and an approved audit schema is available.</p></section>
  </div>
}

function SettingValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#f7f7f4] px-4 py-3"><p className="text-[9px] font-black uppercase tracking-[.12em] text-[#85858d]">{label}</p><p className="mt-1 text-xs font-semibold">{value}</p></div>
}
