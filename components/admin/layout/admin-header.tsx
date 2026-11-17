'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu,
  X,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Shield,
  Monitor,
  ExternalLink,
  User,
  LayoutDashboard,
  Users,
  Activity,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'
import type { AdminProfile } from '@/lib/auth/admin'

export interface AdminHeaderProps {
  profile: AdminProfile
  onSignOut: () => Promise<void>
  isMobileOpen: boolean
  onToggleMobileMenu: () => void
  className?: string
}

const pageTitles: Record<string, { title: string; category: string }> = {
  '/admin': { title: 'Dashboard Overview', category: 'Showcase' },
  '/admin/teams': { title: 'Team Directory', category: 'Teams' },
  '/admin/attendance': { title: 'Attendance Management', category: 'Checkpoints' },
  '/admin/activity': { title: 'Activity Logs', category: 'Audit' },
  '/admin/users': { title: 'Admin Management', category: 'Settings' },
  '/admin/sheets': { title: 'Google Sheets Sync', category: 'Integration' },
}

export function AdminHeader({
  profile,
  onSignOut,
  isMobileOpen,
  onToggleMobileMenu,
  className,
}: AdminHeaderProps) {
  const pathname = usePathname()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Determine current page title
  let currentTitle = 'Project Showcase'
  let currentCategory = 'Workspace'

  if (pageTitles[pathname]) {
    currentTitle = pageTitles[pathname].title
    currentCategory = pageTitles[pathname].category
  } else if (pathname.startsWith('/admin/teams/')) {
    currentTitle = 'Team Details'
    currentCategory = 'Teams'
  }

  // Close profile menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setIsProfileOpen(false)
      }
    }
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileOpen])

  const isSuperAdmin = profile.role === 'super_admin'

  return (
    <header
      className={cn(
        'sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-md px-4 sm:px-7 lg:px-10 transition-colors',
        className
      )}
    >
      <div className="flex min-h-[64px] items-center justify-between gap-4">
        {/* Left: Mobile hamburger or Desktop Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            aria-label={isMobileOpen ? 'Close mobile menu' : 'Open mobile menu'}
            className="grid size-10 place-items-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted lg:hidden"
          >
            {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Mobile Logo */}
          <Link href="/admin" className="flex items-center gap-2.5 lg:hidden min-w-0">
            <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-border/80 bg-white p-0.5 shadow-sm">
              <Image
                src="/student-cabinet-logo.png"
                alt="Student Cabinet logo"
                width={32}
                height={32}
                className="size-full object-contain"
              />
            </span>
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">
              Student Cabinet
            </span>
          </Link>

          {/* Desktop Breadcrumb / Title display */}
          <div className="hidden lg:flex items-center gap-2 text-sm">
            <span className="text-muted-foreground font-medium">{currentCategory}</span>
            <span className="text-cyan-500 font-semibold">/</span>
            <span className="text-foreground font-semibold tracking-tight">{currentTitle}</span>
          </div>
        </div>

        {/* Right side controls: Live Display link, Theme Toggle, Profile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick link to live display */}
          <Link
            href="/display"
            target="_blank"
            rel="noopener noreferrer"
            title="Open Live Venue Display"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-400 transition hover:bg-cyan-500/20"
          >
            <Monitor size={14} className="text-cyan-400" />
            <span>Live Display</span>
            <ExternalLink size={12} className="opacity-70" />
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Profile Menu Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-expanded={isProfileOpen}
              aria-haspopup="true"
              className={cn(
                'flex items-center gap-2.5 rounded-xl border border-border bg-card p-1.5 pr-2.5 sm:px-3 sm:py-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isProfileOpen && 'bg-muted border-primary/50'
              )}
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 font-semibold text-xs border border-cyan-500/20">
                {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : <User size={14} />}
              </div>

              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-foreground max-w-[130px] truncate leading-tight">
                  {profile.full_name || 'Admin'}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  {isSuperAdmin ? (
                    <>
                      <ShieldCheck size={10} className="text-violet-400" />
                      <span className="text-violet-400">Super Admin</span>
                    </>
                  ) : (
                    <>
                      <Shield size={10} className="text-cyan-400" />
                      <span className="text-cyan-400">
                        {profile.desk ? `${profile.desk.toUpperCase()} Desk` : 'Admin'}
                      </span>
                    </>
                  )}
                </span>
              </div>

              <ChevronDown
                size={14}
                className={cn(
                  'text-muted-foreground transition-transform duration-200',
                  isProfileOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2.5 border-b border-border/60">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {profile.full_name || 'Administrator'}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                    {profile.email}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                        isSuperAdmin
                          ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                          : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      )}
                    >
                      {isSuperAdmin ? <ShieldCheck size={10} /> : <Shield size={10} />}
                      {isSuperAdmin ? 'Super Admin' : `${profile.desk ? profile.desk.toUpperCase() : 'Admin'} Desk`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                      <span className="size-1.5 rounded-full bg-emerald-400" /> Active
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    href="/display"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Monitor size={14} className="text-cyan-400" />
                      Live Display
                    </span>
                    <ExternalLink size={12} className="text-muted-foreground" />
                  </Link>

                  {isSuperAdmin && (
                    <Link
                      href="/admin/users"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <ShieldCheck size={14} className="text-violet-400" />
                      Admin Management
                    </Link>
                  )}
                </div>

                <div className="pt-1 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false)
                      onSignOut()
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
