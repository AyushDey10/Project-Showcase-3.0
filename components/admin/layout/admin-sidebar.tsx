'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Activity,
  ShieldCheck,
  FileSpreadsheet,
  Monitor,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminProfile } from '@/lib/auth/admin'

export interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  superAdminOnly?: boolean
  external?: boolean
  badge?: string
}

const navItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/teams',
    label: 'Team Directory',
    icon: Users,
  },
  {
    href: '/admin/attendance',
    label: 'Attendance Management',
    icon: ClipboardCheck,
  },
  {
    href: '/admin/activity',
    label: 'Activity Logs',
    icon: Activity,
  },
  {
    href: '/admin/users',
    label: 'Admin Management',
    icon: ShieldCheck,
    superAdminOnly: true,
  },
  {
    href: '/admin/sheets',
    label: 'Google Sheets Sync',
    icon: FileSpreadsheet,
    superAdminOnly: true,
  },
  {
    href: '/display',
    label: 'Live Display',
    icon: Monitor,
    external: true,
    badge: 'Live',
    superAdminOnly: true,
  },
]

export interface AdminSidebarProps {
  profile: AdminProfile
  isCollapsed: boolean
  onToggleCollapse: () => void
  onSignOut: () => Promise<void>
  className?: string
}

export function AdminSidebar({
  profile,
  isCollapsed,
  onToggleCollapse,
  onSignOut,
  className,
}: AdminSidebarProps) {
  const pathname = usePathname()

  const isSuperAdmin = profile.role === 'super_admin'
  const filteredNav = navItems
    .filter((item) => {
      if (item.superAdminOnly && !isSuperAdmin) return false
      return true
    })
    .map((item) => {
      if (item.href === '/admin/activity' && !isSuperAdmin) {
        return { ...item, label: 'My Desk Activity' }
      }
      return item
    })

  return (
    <aside
      aria-label="Sidebar navigation"
      className={cn(
        'hidden lg:flex flex-col min-h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out sticky top-0 h-screen select-none z-30',
        isCollapsed ? 'w-20 px-2.5 py-4' : 'w-64 px-4 py-5',
        className
      )}
    >
      {/* Branding & Logo */}
      <div className={cn('flex items-center gap-3', isCollapsed ? 'justify-center' : 'px-2')}>
        <Link
          href="/admin"
          className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        >
          <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/80 bg-white p-1 shadow-sm transition-transform group-hover:scale-105">
            <Image
              src="/student-cabinet-logo.png"
              alt="Student Cabinet logo"
              width={40}
              height={40}
              priority
              className="size-full object-contain"
            />
          </span>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight text-foreground truncate">
                Student Cabinet
              </span>
              <span className="block text-xs font-medium text-cyan-400/90 truncate">
                Project Showcase 2026
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Workspace divider label */}
      {!isCollapsed ? (
        <div className="mt-8 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Navigation
        </div>
      ) : (
        <div className="mt-6 border-t border-sidebar-border" />
      )}

      {/* Navigation Links */}
      <nav aria-label="Admin Navigation" className="mt-2.5 flex flex-col gap-1">
        {filteredNav.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/admin'
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`)

          const linkProps = item.external
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {}

          return (
            <Link
              key={item.href}
              href={item.href}
              {...linkProps}
              aria-current={isActive ? 'page' : undefined}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150',
                isCollapsed
                  ? 'size-11 justify-center mx-auto'
                  : 'min-h-11 px-3 py-2.5 gap-3',
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 font-semibold shadow-sm border border-cyan-500/25'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon
                className={cn(
                  'size-5 shrink-0 transition-colors',
                  isActive ? 'text-cyan-400' : 'text-muted-foreground group-hover:text-foreground'
                )}
                aria-hidden="true"
              />

              {!isCollapsed && (
                <span className="flex-1 truncate tracking-tight">{item.label}</span>
              )}

              {!isCollapsed && item.badge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400 border border-cyan-500/30">
                  <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {item.badge}
                </span>
              )}

              {!isCollapsed && item.external && (
                <ExternalLink className="size-3.5 text-muted-foreground/60 shrink-0" />
              )}

              {/* Tooltip on collapsed mode */}
              {isCollapsed && (
                <span className="pointer-events-none absolute left-full ml-3 hidden rounded-lg bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md border border-border group-hover:block z-50 whitespace-nowrap">
                  {item.label}
                  {item.badge ? ` (${item.badge})` : ''}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer & User Profile Panel */}
      <div className="mt-auto pt-4 flex flex-col gap-2">
        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex items-center rounded-xl text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors p-2',
            isCollapsed ? 'justify-center mx-auto size-10' : 'gap-2 px-3 py-2'
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <>
              <ChevronLeft className="size-4" />
              <span>Collapse sidebar</span>
            </>
          )}
        </button>

        {/* User Card */}
        <div
          className={cn(
            'rounded-2xl border border-sidebar-border bg-card/60 transition-all',
            isCollapsed ? 'p-2 flex flex-col items-center' : 'p-3.5'
          )}
        >
          {!isCollapsed ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex size-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-xs font-semibold text-foreground truncate">
                    {profile.full_name || 'Admin'}
                  </span>
                </div>
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                    isSuperAdmin
                      ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                      : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  )}
                >
                  {isSuperAdmin ? 'Super' : profile.desk ? `${profile.desk} Desk` : 'Admin'}
                </span>
              </div>

              <p className="mt-1.5 truncate text-[11px] text-muted-foreground font-mono">
                {profile.email}
              </p>

              <button
                type="button"
                onClick={onSignOut}
                className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-background/60 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                <LogOut className="size-3.5" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onSignOut}
              title={`Sign out (${profile.email ?? 'admin'})`}
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
