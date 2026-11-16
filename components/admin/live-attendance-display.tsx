'use client'

import type { TeamSource } from '@/lib/attendance/source'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme-toggle'
import { ArrowLeft, Radio, UsersRound } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'

export function LiveAttendanceDisplay({ source }: { source: TeamSource }) {
  const router = useRouter()
  useEffect(() => {
    if (!source.configured || !source.tableName) return
    const supabase = createClient()
    const channel = supabase.channel('project-showcase-projector')
      .on('postgres_changes', { event: '*', schema: 'public', table: source.tableName }, () => router.refresh())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [router, source.configured, source.tableName])

  const { present, internal, external } = useMemo(() => {
    const records = source.teams.filter((team) => team.status === 'PRESENT').sort((a, b) => (b.checkedInAt ?? '').localeCompare(a.checkedInAt ?? ''))
    return { present: records, internal: records.filter((team) => team.category === 'internal').length, external: records.filter((team) => team.category === 'external').length }
  }, [source.teams])
  const ready = source.configured && source.issue === null

  return <main className="attendance-display fixed inset-0 z-[100] min-h-screen overflow-y-auto bg-[#0a0a0a] px-5 py-6 text-white sm:px-10 sm:py-8 lg:px-14 lg:py-10">
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-6"><div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-[#c6f135]"><span className="relative size-4 shrink-0 overflow-hidden rounded-full bg-[#ffffff] p-0.5"><Image src="/student-cabinet-logo.png" alt="Student Cabinet logo" width={16} height={16} className="size-full object-contain" /></span>Student Cabinet · Project Showcase 2026</p><h1 className="mt-3 text-3xl font-black tracking-[-.06em] sm:text-5xl lg:text-6xl">LIVE ATTENDANCE</h1></div><div className="flex items-center gap-2"><ThemeToggle /><Link href="/admin" className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-xs font-bold text-white/80 transition hover:bg-white/10"><ArrowLeft size={15} aria-hidden="true" /> Admin dashboard</Link></div></header>
      {source.issue && <div role="status" className="border border-[#8c6320] bg-[#261d0b] px-5 py-4 text-sm text-[#f1d9a6]">Live team data is not connected. Configure the existing Supabase registration-table mapping to enable this display.</div>}
      <section className="grid gap-4 sm:grid-cols-3">
        <DisplayStat label="Total teams present" value={ready ? present.length.toLocaleString() : '—'} emphasis />
        <DisplayStat label="Bennett University" value={ready ? internal.toLocaleString() : '—'} />
        <DisplayStat label="External institutions" value={ready ? external.toLocaleString() : '—'} />
      </section>
      <section className="overflow-hidden border border-white/15 bg-[#141414]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7 sm:py-5"><div><h2 className="text-lg font-black tracking-[-.03em] sm:text-2xl">Checked-in team leaders</h2><p className="mt-1 text-[10px] text-white/45">Latest confirmations · {ready ? present.length.toLocaleString() : '—'} teams</p></div><span className="inline-flex items-center gap-2 rounded-full border border-[#c6f135]/30 px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] text-[#c6f135]"><Radio size={13} aria-hidden="true" /> Live</span></div>
        {present.length ? <div className="divide-y divide-white/10">{present.map((team, index) => <article key={team.teamId} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[68px_minmax(0,1fr)_auto_auto] sm:px-7 sm:py-5"><span className="text-xl font-black text-[#c6f135] sm:text-3xl">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0"><p className="truncate text-base font-bold sm:text-xl">{team.leaderName}</p><p className="mt-1 truncate text-xs text-white/50 sm:text-sm">{team.teamName}</p></div><span className={`hidden rounded-full px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] sm:inline-flex ${team.category === 'internal' ? 'bg-[#c6f135] text-[#111116]' : 'bg-[#dcd1ff] text-[#35244f]'}`}>{team.category}</span><div className="text-right"><span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wider sm:hidden ${team.category === 'internal' ? 'bg-[#c6f135] text-[#111116]' : 'bg-[#dcd1ff] text-[#35244f]'}`}>{team.category}</span><p className="mt-1 text-[10px] text-white/45 sm:text-xs">{team.checkedInAt ? new Intl.DateTimeFormat('en-IN', { timeStyle: 'short' }).format(new Date(team.checkedInAt)) : ''}</p></div></article>)}</div> : <div className="grid min-h-[260px] place-items-center px-6 py-12 text-center"><div><span className="mx-auto grid size-14 place-items-center border border-white/15 text-[#c6f135]"><UsersRound size={22} aria-hidden="true" /></span><h3 className="mt-5 text-lg font-bold">{ready ? 'Waiting for the first team check-in' : 'Display waiting for database setup'}</h3><p className="mt-2 text-xs text-white/45">{ready ? 'Confirmed team leaders will appear here automatically.' : 'No live or sample team records are shown.'}</p></div></div>}
      </section>
      <footer className="flex items-center justify-between gap-4 text-[9px] font-bold uppercase tracking-[.14em] text-white/35"><span>Project Showcase · Bennett University</span><span>Live attendance monitor</span></footer>
    </div>
  </main>
}

function DisplayStat({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={`border p-5 sm:p-7 ${emphasis ? 'border-[#c6f135] bg-[#c6f135] text-[#111116]' : 'border-white/15 bg-[#141414] text-white'}`}><p className={`text-[9px] font-black uppercase tracking-[.18em] ${emphasis ? 'text-[#313b0d]' : 'text-white/45'}`}>{label}</p><p className="mt-4 text-5xl font-black tracking-[-.08em] sm:text-7xl">{value}</p></div>
}
