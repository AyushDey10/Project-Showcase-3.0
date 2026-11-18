'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  Fingerprint,
  FileCheck2,
  Building2,
  Globe,
  Radio,
  Maximize2,
  Minimize2,
  RotateCw,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface DisplayStats {
  totalTeams: number
  totalStudents: number
  reportedCount: number
  photoIdCount: number
  nocCount: number
  fullyVerifiedCount: number
  progress: {
    overall: number
    fullyVerified: number
    reported: number
    photoId: number
    noc: number
  }
  internal: {
    total: number
    reported: number
    photoId: number
    noc: number
    fullyVerified: number
    percent: number
  }
  external: {
    total: number
    reported: number
    photoId: number
    noc: number
    fullyVerified: number
    percent: number
  }
  lastUpdated: string
}

interface LiveDisplayProps {
  initialStats?: DisplayStats | null
}

export function LiveDisplay({ initialStats }: LiveDisplayProps) {
  const [stats, setStats] = useState<DisplayStats | null>(initialStats ?? null)
  const [loading, setLoading] = useState(!initialStats)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(
    initialStats?.lastUpdated ? new Date(initialStats.lastUpdated) : new Date()
  )
  const [currentTime, setCurrentTime] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inFlightRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Clock ticker for the display header
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch updated statistics from protected API with non-overlapping guard
  const fetchStats = useCallback(async (showIndicator = false) => {
    if (inFlightRef.current) return
    inFlightRef.current = true

    if (showIndicator) setIsUpdating(true)

    // Abort any lingering request before starting new one
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const res = await fetch('/api/display/stats', {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!res.ok) {
        throw new Error(`Failed to load live statistics (${res.status})`)
      }
      const data: DisplayStats = await res.json()

      // Only update stats state if values actually changed to avoid re-rendering entire screen
      setStats((prev) => {
        if (!prev) return data
        const hasChanged =
          prev.reportedCount !== data.reportedCount ||
          prev.photoIdCount !== data.photoIdCount ||
          prev.nocCount !== data.nocCount ||
          prev.fullyVerifiedCount !== data.fullyVerifiedCount ||
          prev.totalTeams !== data.totalTeams ||
          prev.totalStudents !== data.totalStudents ||
          prev.internal.fullyVerified !== data.internal.fullyVerified ||
          prev.external.fullyVerified !== data.external.fullyVerified

        return hasChanged ? data : prev
      })

      setLastRefreshedAt(new Date(data.lastUpdated))
      setError(null)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return // Ignore intentional aborts
      }
      console.error('Error fetching live display data:', err)
      setError(err instanceof Error ? err.message : 'Connection interrupted')
    } finally {
      inFlightRef.current = false
      setLoading(false)
      if (showIndicator) {
        setTimeout(() => setIsUpdating(false), 500)
      }
    }
  }, [])

  // Periodic polling every 5 seconds (clean interval)
  useEffect(() => {
    fetchStats()
    const pollInterval = setInterval(() => {
      fetchStats(true)
    }, 5000)

    return () => {
      clearInterval(pollInterval)
      abortControllerRef.current?.abort()
    }
  }, [fetchStats])

  // Supabase Realtime subscription on team_verifications table with debouncing
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    const supabase = createClient()

    try {
      channel = supabase
        .channel('live-display-verifications')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'team_verifications' },
          () => {
            // Debounce burst updates within 400ms into a single fetch
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = setTimeout(() => {
              fetchStats(true)
            }, 400)
          }
        )
        .subscribe()
    } catch (e) {
      console.warn('Realtime subscription could not be established; falling back to active polling.', e)
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchStats])

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err)
      })
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 p-6">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center animate-pulse mb-4">
          <RotateCw className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-slate-100">Connecting to Live Display...</h2>
        <p className="text-sm text-slate-400 mt-1">Aggregating real-time team verification statistics</p>
      </div>
    )
  }

  const s = stats || {
    totalTeams: 0,
    totalStudents: 0,
    reportedCount: 0,
    photoIdCount: 0,
    nocCount: 0,
    fullyVerifiedCount: 0,
    progress: { overall: 0, fullyVerified: 0, reported: 0, photoId: 0, noc: 0 },
    internal: { total: 0, reported: 0, photoId: 0, noc: 0, fullyVerified: 0, percent: 0 },
    external: { total: 0, reported: 0, photoId: 0, noc: 0, fullyVerified: 0, percent: 0 },
    lastUpdated: new Date().toISOString(),
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-cyan-500 selection:text-slate-950 font-sans relative overflow-x-hidden"
    >
      {/* Background ambient lighting effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[25%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-cyan-600/10 blur-[130px]" />
        <div className="absolute top-[40%] -right-[15%] w-[45vw] h-[45vw] rounded-full bg-violet-600/10 blur-[140px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-cyan-500/5 blur-[120px]" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4 sm:pb-6">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Radio className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent">
                PROJECT SHOWCASE 3.0
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Real-Time Verification & Desk Check-In Telemetry
            </p>
          </div>
        </div>

        {/* Header Right Controls & Clock */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Real-time Clock */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-slate-300 text-sm font-mono shadow-inner">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>{currentTime || '00:00:00'}</span>
          </div>

          {/* Sync indicator */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-300 ${
              isUpdating
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 scale-105'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden md:inline">
              {isUpdating ? 'Syncing...' : 'Auto-Sync Active'}
            </span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition shadow-sm"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Admin Back Link */}
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-cyan-400 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </div>
      </header>

      {/* Connection Notice / Error */}
      {error && (
        <div className="relative z-10 my-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error} — attempting automatic reconnection...</span>
          </div>
          <button
            onClick={() => fetchStats(true)}
            className="px-2.5 py-1 rounded-lg bg-rose-900/40 hover:bg-rose-900/60 text-[11px] font-semibold text-rose-200 transition"
          >
            Retry Now
          </button>
        </div>
      )}

      {/* Main Presentation Stage */}
      <main className="relative z-10 flex-1 my-6 flex flex-col justify-center gap-6 max-w-7xl mx-auto w-full">
        {/* Top Hero Banner: Overall Verification Clearance */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-cyan-950/20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                OVERALL VERIFICATION PROGRESS
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                {s.fullyVerifiedCount} of {s.totalTeams} Teams Fully Cleared
              </h2>
              <p className="text-sm sm:text-base text-slate-400">
                External teams are fully cleared when NOC Verification, Identity (ID Card) and Reported are confirmed. Internal teams need only Identity (ID Card) and Reported.
              </p>
            </div>

            {/* Giant Percentage Display */}
            <div className="flex items-baseline gap-2 self-start lg:self-center">
              <span className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-violet-400">
                {s.progress.fullyVerified}%
              </span>
              <span className="text-sm sm:text-base font-semibold text-slate-400 uppercase tracking-wider">
                Cleared
              </span>
            </div>
          </div>

          {/* Segmented Big Progress Bar */}
          <div className="mt-6 space-y-2">
            <div className="h-4 w-full bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-slate-800/80 flex shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-1000 ease-out shadow-lg shadow-cyan-500/30"
                style={{ width: `${Math.min(100, Math.max(0, s.progress.fullyVerified))}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-mono text-slate-400 px-1">
              <span>0% Initialized</span>
              <span>Overall Stage Health: {s.progress.overall}%</span>
              <span>100% Target</span>
            </div>
          </div>
        </div>

        {/* Primary Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
          {/* Card 1: Total Teams */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md flex flex-col justify-between hover:border-cyan-500/30 transition-all duration-300 group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Teams</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-mono">
                {s.totalTeams}
              </div>
              <p className="text-xs text-slate-400 mt-1">Confirmed registrations</p>
            </div>
          </div>

          {/* Card 2: Total Students */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md flex flex-col justify-between hover:border-violet-500/30 transition-all duration-300 group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Students</span>
              <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-mono">
                {s.totalStudents}
              </div>
              <p className="text-xs text-slate-400 mt-1">Active participants</p>
            </div>
          </div>

          {/* Card 3: Teams Reported */}
          <div className="rounded-2xl bg-slate-900/60 border border-cyan-500/20 p-5 backdrop-blur-md flex flex-col justify-between hover:border-cyan-500/40 transition-all duration-300 group shadow-lg shadow-cyan-950/20">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Reported</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-cyan-300 font-mono">
                {s.reportedCount}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                <span>{s.progress.reported}% of total</span>
                <span className="font-mono text-cyan-400">/{s.totalTeams}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Identity (ID Card) */}
          <div className="rounded-2xl bg-slate-900/60 border border-violet-500/20 p-5 backdrop-blur-md flex flex-col justify-between hover:border-violet-500/40 transition-all duration-300 group shadow-lg shadow-violet-950/20">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-300">Identity (ID Card)</span>
              <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform">
                <Fingerprint className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-violet-300 font-mono">
                {s.photoIdCount}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                <span>{s.progress.photoId}% of total</span>
                <span className="font-mono text-violet-400">/{s.totalTeams}</span>
              </div>
            </div>
          </div>

          {/* Card 5: NOC Verification (external teams only) */}
          <div className="col-span-2 lg:col-span-1 rounded-2xl bg-slate-900/60 border border-emerald-500/20 p-5 backdrop-blur-md flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-300 group shadow-lg shadow-emerald-950/20">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">NOC Verification</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <FileCheck2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-emerald-300 font-mono">
                {s.nocCount}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                <span>{s.progress.noc}% of external</span>
                <span className="font-mono text-emerald-400">/{s.external.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Verification Pillar Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Pillar 1: Reported (workflow step 3) */}
          <div className="order-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">3. Reported</h3>
              </div>
              <span className="text-sm font-bold font-mono text-cyan-400">{s.progress.reported}%</span>
            </div>
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, s.progress.reported))}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>{s.reportedCount} Verified</span>
              <span>{Math.max(0, s.totalTeams - s.reportedCount)} Pending</span>
            </div>
          </div>

          {/* Pillar 2: Identity (ID Card) — workflow step 2 */}
          <div className="order-2 rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">2. Identity (ID Card)</h3>
              </div>
              <span className="text-sm font-bold font-mono text-violet-400">{s.progress.photoId}%</span>
            </div>
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, s.progress.photoId))}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>{s.photoIdCount} Verified</span>
              <span>{Math.max(0, s.totalTeams - s.photoIdCount)} Pending</span>
            </div>
          </div>

          {/* Pillar 3: NOC Verification — workflow step 1 (external only) */}
          <div className="order-1 rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 backdrop-blur-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">1. NOC Verification (External)</h3>
              </div>
              <span className="text-sm font-bold font-mono text-emerald-400">{s.progress.noc}%</span>
            </div>
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, s.progress.noc))}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>{s.nocCount} Verified</span>
              <span>{Math.max(0, s.external.total - s.nocCount)} Pending</span>
            </div>
          </div>
        </div>

        {/* Institution Breakdown: Internal (Bennett University) vs External */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Internal Teams Card */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-cyan-500/20 p-5 sm:p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Internal Teams
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-normal border border-cyan-500/20">
                      Bennett University
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Host university project contingents</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black font-mono text-cyan-400">
                  {s.internal.total}
                </div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Teams</span>
              </div>
            </div>

            {/* Internal Breakdown Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="order-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="text-xs text-slate-400">Reported</div>
                <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">
                  {s.internal.reported}
                </div>
              </div>
              <div className="order-1 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="text-xs text-slate-400">Identity</div>
                <div className="text-lg font-bold font-mono text-violet-300 mt-0.5">
                  {s.internal.photoId}
                </div>
              </div>
              <div className="order-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="text-xs text-slate-400">NOC</div>
                <div className="text-[11px] font-semibold text-slate-400 mt-1">
                  Not Required
                </div>
              </div>
            </div>

            {/* Internal Clearance Progress */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Fully Cleared</span>
                <span className="font-mono font-semibold text-cyan-400">
                  {s.internal.fullyVerified} / {s.internal.total} ({s.internal.percent}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-1000"
                  style={{ width: `${Math.min(100, Math.max(0, s.internal.percent))}%` }}
                />
              </div>
            </div>
          </div>

          {/* External Teams Card */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-violet-500/20 p-5 sm:p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    External Teams
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 font-normal border border-violet-500/20">
                      Partner Colleges
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Visiting collegiate institutions</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black font-mono text-violet-400">
                  {s.external.total}
                </div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Teams</span>
              </div>
            </div>

            {/* External Breakdown Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="order-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="text-xs text-slate-400">Reported</div>
                <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">
                  {s.external.reported}
                </div>
              </div>
              <div className="order-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="text-xs text-slate-400">Identity</div>
                <div className="text-lg font-bold font-mono text-violet-300 mt-0.5">
                  {s.external.photoId}
                </div>
              </div>
              <div className="order-1 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="text-xs text-slate-400">NOC</div>
                <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">
                  {s.external.noc}
                </div>
              </div>
            </div>

            {/* External Clearance Progress */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Fully Cleared</span>
                <span className="font-mono font-semibold text-violet-400">
                  {s.external.fullyVerified} / {s.external.total} ({s.external.percent}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-1000"
                  style={{ width: `${Math.min(100, Math.max(0, s.external.percent))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="relative z-10 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>
            Student Cabinet Project Showcase Management System
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span>
            Telemetry Source: Verified Supabase Registry
          </span>
          <span className="text-slate-600">•</span>
          <span>
            Last Synced:{' '}
            {lastRefreshedAt.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </span>
        </div>
      </footer>
    </div>
  )
}
