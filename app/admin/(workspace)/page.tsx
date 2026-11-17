import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ClipboardCheck,
  Fingerprint,
  FileCheck2,
  Building2,
  Globe,
  Activity,
  ArrowRight,
  ChevronRight,
  Monitor,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Layers,
} from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedRegistrationData } from '@/lib/supabase/event-cache'
import { requireAdminSession, type AdminProfile } from '@/lib/auth/admin'
import { isInternalInstitution, getTeamDesk } from '@/lib/teams/classification'
import { PageContainer } from '@/components/admin/page-container'
import { StatCard } from '@/components/admin/stat-card'
import { StatusBadge } from '@/components/admin/status-badge'
import { EmptyState } from '@/components/admin/empty-state'
import { ErrorState } from '@/components/admin/error-state'
import { DashboardQuickActions } from '@/components/admin/dashboard-quick-actions'

export const metadata: Metadata = {
  title: 'Dashboard — Project Showcase 3.0',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function formatTimestamp(ts: string | null) {
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

function fieldLabel(fieldName: string) {
  if (fieldName === 'reported') return 'Reported'
  if (fieldName === 'photo_id_checked') return 'Photo ID'
  if (fieldName === 'noc_received') return 'NOC'
  return fieldName
}

async function fetchDashboardData(profile: AdminProfile) {
  const supabase = createAdminClient()

  try {
    const isSuper = profile.role === 'super_admin'
    const deskScope = profile.role === 'admin' ? profile.desk : 'all'

    const [registration, verificationsRes, logsRes] = await Promise.all([
      getCachedRegistrationData(),
      supabase
        .from('team_verifications')
        .select('team_id, reported, photo_id_checked, noc_received'),
      supabase
        .from('verification_audit_logs')
        .select('id, event_no, team_id, field_name, new_value, previous_value, admin_email, created_at, reason')
        .order('event_no', { ascending: false })
        .limit(20),
    ])

    const allTeams = registration.teams
    const teamMap = registration.teamMap
    const vMap = new Map((verificationsRes.data ?? []).map((v) => [v.team_id, v]))

    const internalTeams = allTeams.filter((t) => isInternalInstitution(t.institution))
    const externalTeams = allTeams.filter((t) => !isInternalInstitution(t.institution))

    const internalCount = internalTeams.length
    const externalCount = externalTeams.length

    let internalReported = 0
    let internalPhotoId = 0
    let internalNoc = 0
    let internalFullyVerified = 0

    for (const t of internalTeams) {
      const v = vMap.get(t.id)
      const rep = Boolean(v?.reported)
      const pho = Boolean(v?.photo_id_checked)
      const noc = Boolean(v?.noc_received)
      if (rep) internalReported++
      if (pho) internalPhotoId++
      if (noc) internalNoc++
      if (rep && pho && noc) internalFullyVerified++
    }

    let externalReported = 0
    let externalPhotoId = 0
    let externalNoc = 0
    let externalFullyVerified = 0

    for (const t of externalTeams) {
      const v = vMap.get(t.id)
      const rep = Boolean(v?.reported)
      const pho = Boolean(v?.photo_id_checked)
      const noc = Boolean(v?.noc_received)
      if (rep) externalReported++
      if (pho) externalPhotoId++
      if (noc) externalNoc++
      if (rep && pho && noc) externalFullyVerified++
    }

    // Filter recent activity based on desk scope
    const recentActivity = (logsRes.data ?? [])
      .map((log) => {
        const team = teamMap.get(log.team_id)
        const desk = getTeamDesk(team?.institution)
        return {
          ...log,
          team_name: team?.team_name || (team?.source_team_id ? `Team ${team.source_team_id}` : `Team ${log.team_id.slice(0, 8)}`),
          source_team_id: team?.source_team_id ?? null,
          institution: team?.institution ?? null,
          desk,
        }
      })
      .filter((log) => {
        if (isSuper) return true
        return log.desk === profile.desk
      })
      .slice(0, 10)

    // Scoped metrics for current admin view
    let displayTotalTeams = allTeams.length
    let displayStudents = registration.totalStudents
    let displayReported = internalReported + externalReported
    let displayPhotoId = internalPhotoId + externalPhotoId
    let displayNoc = internalNoc + externalNoc
    let displayFullyVerified = internalFullyVerified + externalFullyVerified

    // Dynamic student counts per desk from cached registration data
    const internalStudents = registration.internalStudents
    const externalStudents = registration.externalStudents

    if (!isSuper && profile.desk === 'internal') {
      displayTotalTeams = internalCount
      displayStudents = internalStudents
      displayReported = internalReported
      displayPhotoId = internalPhotoId
      displayNoc = internalNoc
      displayFullyVerified = internalFullyVerified
    } else if (!isSuper && profile.desk === 'external') {
      displayTotalTeams = externalCount
      displayStudents = externalStudents
      displayReported = externalReported
      displayPhotoId = externalPhotoId
      displayNoc = externalNoc
      displayFullyVerified = externalFullyVerified
    }

    const totalExpectedCheckpoints = displayTotalTeams * 3
    const totalCompletedCheckpoints = displayReported + displayPhotoId + displayNoc
    const pendingCheckpoints = Math.max(0, totalExpectedCheckpoints - totalCompletedCheckpoints)

    return {
      error: null,
      isSuper,
      deskScope,
      totalTeams: displayTotalTeams,
      totalStudents: displayStudents,
      reportedCount: displayReported,
      photoIdCount: displayPhotoId,
      nocCount: displayNoc,
      fullyVerifiedCount: displayFullyVerified,
      pendingCheckpoints,
      internalCount,
      externalCount,
      internalStudents,
      externalStudents,
      internalReported,
      internalPhotoId,
      internalNoc,
      internalFullyVerified,
      externalReported,
      externalPhotoId,
      externalNoc,
      externalFullyVerified,
      recentActivity,
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Could not load dashboard statistics.',
      isSuper: false,
      deskScope: 'all',
      totalTeams: 0,
      totalStudents: 0,
      reportedCount: 0,
      photoIdCount: 0,
      nocCount: 0,
      fullyVerifiedCount: 0,
      pendingCheckpoints: 0,
      internalCount: 0,
      externalCount: 0,
      internalStudents: 0,
      externalStudents: 0,
      internalReported: 0,
      internalPhotoId: 0,
      internalNoc: 0,
      internalFullyVerified: 0,
      externalReported: 0,
      externalPhotoId: 0,
      externalNoc: 0,
      externalFullyVerified: 0,
      recentActivity: [],
    }
  }
}

export default async function AdminDashboardPage() {
  const session = await requireAdminSession()
  const { profile } = session
  const data = await fetchDashboardData(profile)

  if (data.error) {
    return (
      <PageContainer title="Dashboard" description="Real-time verification metrics and event operations.">
        <ErrorState
          title="Failed to Load Dashboard Data"
          message={data.error}
        />
      </PageContainer>
    )
  }

  const {
    isSuper,
    deskScope,
    totalTeams,
    totalStudents,
    internalCount,
    externalCount,
    internalStudents,
    externalStudents,
    reportedCount,
    photoIdCount,
    nocCount,
    fullyVerifiedCount,
    pendingCheckpoints,
    internalReported,
    internalPhotoId,
    internalNoc,
    internalFullyVerified,
    externalReported,
    externalPhotoId,
    externalNoc,
    externalFullyVerified,
    recentActivity,
  } = data

  const reportedRemaining = totalTeams - reportedCount
  const photoIdRemaining = totalTeams - photoIdCount
  const nocRemaining = totalTeams - nocCount

  const reportedPct = totalTeams > 0 ? Math.round((reportedCount / totalTeams) * 100) : 0
  const photoIdPct = totalTeams > 0 ? Math.round((photoIdCount / totalTeams) * 100) : 0
  const nocPct = totalTeams > 0 ? Math.round((nocCount / totalTeams) * 100) : 0
  const fullyVerifiedPct = totalTeams > 0 ? Math.round((fullyVerifiedCount / totalTeams) * 100) : 0

  const internalPct = internalCount + externalCount > 0
    ? Math.round((internalCount / (internalCount + externalCount)) * 100)
    : 0
  const externalPct = 100 - internalPct

  const internalReportedPct = internalCount > 0 ? Math.round((internalReported / internalCount) * 100) : 0
  const internalPhotoIdPct = internalCount > 0 ? Math.round((internalPhotoId / internalCount) * 100) : 0
  const internalNocPct = internalCount > 0 ? Math.round((internalNoc / internalCount) * 100) : 0

  const externalReportedPct = externalCount > 0 ? Math.round((externalReported / externalCount) * 100) : 0
  const externalPhotoIdPct = externalCount > 0 ? Math.round((externalPhotoId / externalCount) * 100) : 0
  const externalNocPct = externalCount > 0 ? Math.round((externalNoc / externalCount) * 100) : 0

  const pageTitle = isSuper
    ? 'Dashboard Overview'
    : `${deskScope === 'internal' ? 'Internal Desk' : 'External Desk'} Dashboard`

  const pageDescription = isSuper
    ? 'Project Showcase 2026 — Real-time verification progress across All Desks (Super Admin).'
    : `Project Showcase 2026 — Scoped to ${deskScope === 'internal' ? 'Bennett University Teams (Internal)' : 'Other Institutions (External)'}.`

  return (
    <PageContainer
      title={pageTitle}
      description={pageDescription}
      actions={
        <div className="flex items-center gap-3">
          <StatusBadge
            type="desk"
            desk={deskScope}
            role={isSuper ? 'super_admin' : 'admin'}
          />
          <Link
            href="/display"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-all shadow-sm"
          >
            <Monitor size={15} />
            <span>Launch Live Display</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Quick Search & Actions */}
        <section aria-label="Quick Actions">
          <DashboardQuickActions />
        </section>

        {/* 1. Primary Metrics Statistics Grid */}
        <section aria-label="Key Statistics">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={isSuper ? 'Total Registered Teams' : `${deskScope === 'internal' ? 'Internal' : 'External'} Registered Teams`}
              value={totalTeams}
              subtext={isSuper ? `${internalCount} Internal · ${externalCount} External` : `Assigned exclusively to ${deskScope} desk`}
              iconName="users"
              color="cyan"
            />
            <StatCard
              label="Registered Students"
              value={totalStudents}
              subtext={isSuper ? 'Across all 130 teams' : `Across ${totalTeams} ${deskScope} teams`}
              iconName="graduation-cap"
              color="violet"
            />
            <StatCard
              label="Teams Reported"
              value={reportedCount}
              subtext={`${reportedRemaining} teams pending arrival`}
              iconName="clipboard-check"
              color="emerald"
            />
            <StatCard
              label="Photo IDs Checked"
              value={photoIdCount}
              subtext={`${photoIdRemaining} teams awaiting ID verification`}
              iconName="fingerprint"
              color="cyan"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="NOCs Received"
              value={nocCount}
              subtext={`${nocRemaining} teams awaiting NOC clearance`}
              iconName="file-check"
              color="amber"
            />
            <StatCard
              label="Fully Completed Teams"
              value={fullyVerifiedCount}
              subtext={`${fullyVerifiedPct}% of ${isSuper ? 'all' : deskScope} teams fully cleared`}
              iconName="shieldAlert"
              color="emerald"
            />
            <StatCard
              label="Pending Checkpoints"
              value={pendingCheckpoints}
              subtext="Total remaining verifications"
              iconName="activity"
              color="rose"
            />
          </div>

          {isSuper && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Internal Teams (Bennett University)"
                value={internalCount}
                subtext={`${internalStudents} registered students · ${internalPct}% of showcase`}
                iconName="building"
                color="indigo"
              />
              <StatCard
                label="External Teams (Other Institutions)"
                value={externalCount}
                subtext={`${externalStudents} registered students · ${externalPct}% of showcase`}
                iconName="globe"
                color="rose"
              />
            </div>
          )}
        </section>

        {/* Fully Cleared Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-cyan-950/30 via-card to-violet-950/20 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground tracking-tight">
                    Full Verification Clearance ({isSuper ? 'All Desks' : `${deskScope === 'internal' ? 'Internal' : 'External'} Desk`})
                  </h2>
                  <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/30">
                    {fullyVerifiedPct}% Cleared
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Teams with all three verifications completed (Reported + Photo ID Checked + NOC Received).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 sm:border-l sm:border-border sm:pl-6">
              <div className="text-left sm:text-right">
                <span className="text-2xl font-semibold tabular-nums text-foreground">
                  {fullyVerifiedCount} <span className="text-sm font-normal text-muted-foreground">/ {totalTeams}</span>
                </span>
                <span className="block text-[11px] text-cyan-400 font-medium">
                  {totalTeams - fullyVerifiedCount} pending full clearance
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Verification Progress Sections */}
        <section aria-label="Verification Progress" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Verification Progress
              </h2>
              <p className="text-xs text-muted-foreground">
                Completion breakdowns across the three independent verification checkpoints.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* 1. Reported Progress */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    <ClipboardCheck className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Reported Status</h3>
                    <p className="text-[11px] text-muted-foreground">Venue arrival check-in</p>
                  </div>
                </div>
                <span className="text-2xl font-bold tabular-nums text-emerald-400">
                  {reportedPct}%
                </span>
              </div>

              <div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/80">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${reportedPct}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                <span className="font-medium text-emerald-400">
                  {reportedCount} Completed
                </span>
                <span className="text-muted-foreground">
                  {reportedRemaining} Remaining ({totalTeams} total)
                </span>
              </div>

              {isSuper && (
                <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Bennett University:</span>
                    <span className="font-mono text-foreground font-medium">
                      {internalReported}/{internalCount} ({internalReportedPct}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>External Teams:</span>
                    <span className="font-mono text-foreground font-medium">
                      {externalReported}/{externalCount} ({externalReportedPct}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Photo ID Progress */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                    <Fingerprint className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Photo ID Checked</h3>
                    <p className="text-[11px] text-muted-foreground">Physical ID card verification</p>
                  </div>
                </div>
                <span className="text-2xl font-bold tabular-nums text-cyan-400">
                  {photoIdPct}%
                </span>
              </div>

              <div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/80">
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                    style={{ width: `${photoIdPct}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                <span className="font-medium text-cyan-400">
                  {photoIdCount} Completed
                </span>
                <span className="text-muted-foreground">
                  {photoIdRemaining} Remaining ({totalTeams} total)
                </span>
              </div>

              {isSuper && (
                <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Bennett University:</span>
                    <span className="font-mono text-foreground font-medium">
                      {internalPhotoId}/{internalCount} ({internalPhotoIdPct}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>External Teams:</span>
                    <span className="font-mono text-foreground font-medium">
                      {externalPhotoId}/{externalCount} ({externalPhotoIdPct}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. NOC Verification Progress */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
                    <FileCheck2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">NOC Received</h3>
                    <p className="text-[11px] text-muted-foreground">Institutional approval clearance</p>
                  </div>
                </div>
                <span className="text-2xl font-bold tabular-nums text-amber-400">
                  {nocPct}%
                </span>
              </div>

              <div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/80">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${nocPct}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                <span className="font-medium text-amber-400">
                  {nocCount} Completed
                </span>
                <span className="text-muted-foreground">
                  {nocRemaining} Remaining ({totalTeams} total)
                </span>
              </div>

              {isSuper && (
                <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Bennett University:</span>
                    <span className="font-mono text-foreground font-medium">
                      {internalNoc}/{internalCount} ({internalNocPct}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>External Teams:</span>
                    <span className="font-mono text-foreground font-medium">
                      {externalNoc}/{externalCount} ({externalNocPct}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3. Category Overview (Internal vs External) — Visible to Super Admin or tailored for Desk */}
        {isSuper && (
          <section aria-label="Category Overview" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Institution Category Overview
                </h2>
                <p className="text-xs text-muted-foreground">
                  Verification status segregated by Bennett University (internal) and other universities (external).
                </p>
              </div>
            </div>

            {/* Visual Ratio Bar */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-cyan-400">
                  <Building2 size={13} /> Bennett University: {internalCount} teams ({internalPct}%)
                </span>
                <span className="flex items-center gap-1.5 font-medium text-amber-400">
                  <Globe size={13} /> Other Institutions: {externalCount} teams ({externalPct}%)
                </span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="bg-cyan-500 transition-all duration-500"
                  style={{ width: `${internalPct}%` }}
                  title={`Internal: ${internalCount} teams`}
                />
                <div
                  className="bg-amber-500 transition-all duration-500"
                  style={{ width: `${externalPct}%` }}
                  title={`External: ${externalCount} teams`}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Internal Teams Card */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Bennett University (Internal)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {internalCount} registered teams
                      </p>
                    </div>
                  </div>
                  <StatusBadge type="category" category="internal" size="sm" />
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Reported:</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {internalReported} / {internalCount} ({internalReportedPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${internalReportedPct}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Photo ID Checked:</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {internalPhotoId} / {internalCount} ({internalPhotoIdPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${internalPhotoIdPct}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">NOC Received:</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {internalNoc} / {internalCount} ({internalNocPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${internalNocPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Fully Cleared: <strong className="text-foreground">{internalFullyVerified}</strong>
                  </span>
                  <Link
                    href="/admin/teams?category=internal"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Browse Internal Teams <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

              {/* External Teams Card */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Globe className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Other Institutions (External)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {externalCount} registered teams
                      </p>
                    </div>
                  </div>
                  <StatusBadge type="category" category="external" size="sm" />
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Reported:</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {externalReported} / {externalCount} ({externalReportedPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${externalReportedPct}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Photo ID Checked:</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {externalPhotoId} / {externalCount} ({externalPhotoIdPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${externalPhotoIdPct}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">NOC Received:</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {externalNoc} / {externalCount} ({externalNocPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${externalNocPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Fully Cleared: <strong className="text-foreground">{externalFullyVerified}</strong>
                  </span>
                  <Link
                    href="/admin/teams?category=external"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Browse External Teams <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 4. Recent Activity Log */}
        <section aria-label="Recent Activity">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Activity size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Recent Verification Activity</h2>
                  <p className="text-xs text-muted-foreground">
                    {isSuper
                      ? 'Real-time audit log of team status changes across all desks'
                      : `Real-time audit log for ${deskScope === 'internal' ? 'Internal' : 'External'} teams`}
                  </p>
                </div>
              </div>

              <Link
                href="/admin/activity"
                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View Full Log <ChevronRight size={14} />
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  iconName="activity"
                  title="No Verification Activity Yet"
                  description="When administrators check in teams, verify IDs or clear NOCs, the audit trail will appear here."
                />
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentActivity.map((log) => {
                  const isVerified = Boolean(log.new_value)
                  return (
                    <Link
                      key={log.id || log.event_no}
                      href={`/admin/teams/${log.team_id}`}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground group-hover:text-cyan-400 transition-colors truncate max-w-[260px] sm:max-w-[320px]">
                              {log.team_name}
                            </span>
                            {log.source_team_id && (
                              <span className="font-mono text-[11px] text-muted-foreground/80">
                                ({log.source_team_id})
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>By <strong className="text-foreground/90 font-medium">{log.admin_email}</strong></span>
                            {log.reason && (
                              <span className="italic text-rose-300/90 text-[11px] bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 max-w-xs truncate">
                                Reason: {log.reason}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                        <div className="flex items-center gap-2">
                          <StatusBadge type="category" category={log.desk ?? 'external'} size="sm" />
                          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground border border-border">
                            {fieldLabel(log.field_name)}
                          </span>
                          <StatusBadge
                            type="action"
                            action={isVerified ? 'verified' : 'reversed'}
                            size="sm"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock size={12} className="opacity-70" />
                          <span className="whitespace-nowrap">{formatTimestamp(log.created_at)}</span>
                          <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageContainer>
  )
}
