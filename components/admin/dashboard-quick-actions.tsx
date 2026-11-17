'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Users,
  Activity,
  Monitor,
  Building2,
  Globe,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

export function DashboardQuickActions() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (trimmed) {
      router.push(`/admin/teams?q=${encodeURIComponent(trimmed)}`)
    } else {
      router.push('/admin/teams')
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams by name, project, student, enrollment, email..."
            className="w-full rounded-2xl border border-border bg-card/80 py-3.5 pl-11 pr-28 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-cyan-500/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
          <button
            type="submit"
            className="absolute right-2 rounded-xl bg-cyan-500/15 px-3.5 py-1.5 text-xs font-semibold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {/* Action Shortcuts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/admin/teams"
          className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:border-cyan-500/40 hover:bg-card/80"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Users className="size-4" />
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <span className="block text-sm font-semibold text-foreground group-hover:text-cyan-400 transition-colors">
              Team Directory
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Browse all 130 teams
            </span>
          </div>
        </Link>

        <Link
          href="/admin/teams?category=internal"
          className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:border-indigo-500/40 hover:bg-card/80"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Building2 className="size-4" />
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <span className="block text-sm font-semibold text-foreground group-hover:text-indigo-400 transition-colors">
              Internal Teams
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Bennett University
            </span>
          </div>
        </Link>

        <Link
          href="/admin/teams?category=external"
          className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:border-violet-500/40 hover:bg-card/80"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Globe className="size-4" />
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <span className="block text-sm font-semibold text-foreground group-hover:text-violet-400 transition-colors">
              External Teams
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Other Institutions
            </span>
          </div>
        </Link>

        <Link
          href="/admin/activity"
          className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:border-cyan-500/40 hover:bg-card/80"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="size-4" />
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <span className="block text-sm font-semibold text-foreground group-hover:text-cyan-400 transition-colors">
              Activity Logs
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Audit trail & history
            </span>
          </div>
        </Link>
      </div>
    </div>
  )
}
