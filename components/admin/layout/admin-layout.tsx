'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Activity,
  ShieldCheck,
  FileSpreadsheet,
  Monitor,
  LogOut,
  X,
  ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AdminSidebar, type NavItem } from '@/components/admin/layout/admin-sidebar'
import { AdminHeader } from '@/components/admin/layout/admin-header'
import { cn } from '@/lib/utils'
import type { AdminSession } from '@/lib/auth/admin'

export interface AdminLayoutProps {
  children: React.ReactNode
  session: AdminSession
}

const mobileNavItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/teams', label: 'Team Directory', icon: Users },
  { href: '/admin/attendance', label: 'Attendance Management', icon: ClipboardCheck },
  { href: '/admin/activity', label: 'Activity Logs', icon: Activity },
  { href: '/admin/users', label: 'Admin Management', icon: ShieldCheck, superAdminOnly: true },
  { href: '/admin/sheets', label: 'Google Sheets Sync', icon: FileSpreadsheet, superAdminOnly: true },
  { href: '/display', label: 'Live Display', icon: Monitor, external: true, badge: 'Live', superAdminOnly: true },
]

export function AdminLayout({ children, session }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = session

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Load sidebar preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('project-showcase-sidebar-collapsed')
      if (stored !== null) {
        setIsCollapsed(stored === 'true')
      }
    } catch {
      // Ignore if localStorage unavailable
    }
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileOpen])

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('project-showcase-sidebar-collapsed', String(next))
      } catch {
        // Ignore
      }
      return next
    })
  }

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      router.replace('/admin/login')
      router.refresh()
    }
  }

  const isSuperAdmin = profile.role === 'super_admin'
  const filteredMobileNav = mobileNavItems
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
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <AdminSidebar
        profile={profile}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onSignOut={handleSignOut}
      />

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-sidebar border-r border-sidebar-border text-sidebar-foreground p-5 flex flex-col transition-transform duration-300 ease-in-out lg:hidden shadow-2xl',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-3 pb-5 border-b border-sidebar-border">
          <Link
            href="/admin"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-3"
          >
            <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-white p-1 shadow-sm">
              <Image
                src="/student-cabinet-logo.png"
                alt="Student Cabinet logo"
                width={38}
                height={38}
                className="size-full object-contain"
              />
            </span>
            <div className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight text-foreground truncate">
                Student Cabinet
              </span>
              <span className="block text-xs font-medium text-cyan-400 truncate">
                Project Showcase 2026
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Navigation Links */}
        <nav className="mt-5 flex flex-col gap-1.5 flex-1 overflow-y-auto">
          {filteredMobileNav.map((item) => {
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
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 font-semibold border border-cyan-500/30'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon size={18} className={isActive ? 'text-cyan-400' : 'text-muted-foreground'} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400 border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}
                {item.external && (
                  <ExternalLink size={13} className="text-muted-foreground/60 shrink-0" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Drawer User Card */}
        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <div className="rounded-2xl border border-sidebar-border bg-card/60 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground truncate">
                {profile.full_name || 'Admin'}
              </span>
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  isSuperAdmin
                    ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                    : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                )}
              >
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-muted-foreground font-mono">
              {profile.email}
            </p>

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-background/60 py-2 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10"
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AdminHeader
          profile={profile}
          onSignOut={handleSignOut}
          isMobileOpen={isMobileOpen}
          onToggleMobileMenu={() => setIsMobileOpen((prev) => !prev)}
        />

        <main className="flex-1 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
