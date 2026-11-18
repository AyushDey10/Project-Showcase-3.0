'use client'

import React, { useEffect } from 'react'
import { AlertTriangle, Loader2, MapPin, ShieldAlert } from 'lucide-react'
import {
  hasCompleteReportingLocation,
  type ReportingLocation,
} from '@/lib/teams/reporting-location'

interface ReportingLocationPopupProps {
  isOpen: boolean
  loading?: boolean
  error?: string | null
  team: {
    source_team_id: string | null
    team_name: string | null
    project_title?: string | null
  } | null
  location: ReportingLocation | null
  onClose: () => void
}

/**
 * Shown to volunteers immediately after a team is successfully marked Reported.
 * The block and table are deliberately oversized so they can be read from a
 * distance during busy registration.
 */
export function ReportingLocationPopup({
  isOpen,
  loading = false,
  error = null,
  team,
  location,
  onClose,
}: ReportingLocationPopupProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const complete = hasCompleteReportingLocation(location)
  const block = location?.reporting_block ?? null
  const table = location?.table_number ?? null
  const panel = location?.panel_number ?? null
  const teamName =
    team?.team_name?.trim() || team?.project_title?.trim() || 'Unnamed Team'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-background/85 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reporting-location-popup-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-emerald-500/30 bg-card shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Heading */}
        <div className="flex items-start gap-3 border-b border-border/60 bg-emerald-500/[0.07] px-5 py-5 sm:px-6">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
            <MapPin className="size-6" />
          </div>
          <div className="min-w-0">
            <h2
              id="reporting-location-popup-title"
              className="text-lg font-bold tracking-tight text-foreground sm:text-xl"
            >
              Reporting Location Assigned
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Direct the team to its evaluation location before it leaves the desk.
            </p>
          </div>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background/50 px-4 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Fetching the assigned reporting location...</span>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-5 text-center">
              <ShieldAlert className="mx-auto mb-2 size-6 text-rose-400" />
              <p className="text-sm font-semibold text-rose-300">
                Could not load the reporting location. Please check the Team Details
                page.
              </p>
            </div>
          ) : complete ? (
            <>
              <p className="text-sm font-medium text-muted-foreground">
                Please direct this team to:
              </p>

              <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/[0.06] px-4 py-6 text-center">
                <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  Block {block} <span className="text-emerald-400">·</span> Table{' '}
                  {table}
                </p>
                <p className="mt-2 text-sm font-semibold text-emerald-400">
                  Panel {panel}
                </p>
              </div>

              <p className="text-sm leading-relaxed text-foreground/90">
                Ask the team to report at{' '}
                <strong className="font-semibold text-foreground">
                  Block {block}, Table {table}
                </strong>{' '}
                for their evaluation.
              </p>
            </>
          ) : (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-6 text-center">
              <AlertTriangle className="mx-auto mb-2 size-6 text-amber-400" />
              <p className="text-base font-semibold text-amber-300">
                Reporting location not assigned. Please contact the Super Admin.
              </p>
            </div>
          )}

          {/* Team identity */}
          <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border/60 bg-background/50 p-4 sm:grid-cols-2">
            <div className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
                Team
              </span>
              <span
                className="block truncate text-sm font-semibold text-foreground"
                title={teamName}
              >
                {teamName}
              </span>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
                Team ID
              </span>
              <span className="block truncate font-mono text-sm font-semibold text-cyan-400">
                {team?.source_team_id ?? '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-4 sm:px-6">
          <p className="hidden text-[11px] text-muted-foreground sm:block">
            This location also stays visible in Team Details.
          </p>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="w-full rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 sm:w-auto"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
