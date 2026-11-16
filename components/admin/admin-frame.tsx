'use client'

import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme-toggle'
import { ArrowLeft, BarChart3, DoorOpen, FileCheck2, LayoutDashboard, ListChecks, QrCode, Radio, UserRoundCheck, UsersRound } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navigation = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/attendance', label: 'All teams', icon: ListChecks },
  { href: '/admin/internal', label: 'Internal teams', icon: UserRoundCheck },
  { href: '/admin/external', label: 'External teams', icon: UsersRound },
  { href: '/admin/present', label: 'Present', icon: FileCheck2 },
  { href: '/admin/absent', label: 'Absent', icon: BarChart3 },
  { href: '/admin/display', label: 'Projector display', icon: Radio },
  { href: '/admin/settings', label: 'QR & settings', icon: QrCode },
]

export function AdminFrame({ children, email }: { children: React.ReactNode; email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/admin/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Link href="/" className="flex items-center gap-3 px-2 py-2">
          <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-[#ffffff] p-1 shadow-sm">
            <Image
              src="/student-cabinet-logo.png"
              alt="Student Cabinet logo"
              width={40}
              height={40}
              className="size-full object-contain"
            />
          </span>
          <span><span className="block text-sm font-semibold">Student Cabinet</span><span className="mt-1 block text-xs text-muted-foreground">Project Showcase 2026</span></span>
        </Link>
        <div className="mt-10 px-3 text-xs font-medium uppercase tracking-[.12em] text-muted-foreground">Workspace</div>
        <nav aria-label="Admin navigation" className="mt-3 flex flex-col gap-1">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
            return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}><Icon size={17} aria-hidden="true" />{label}</Link>
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-sidebar-border bg-muted p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary"><span className="size-2 rounded-full bg-primary" /> Admin session</div>
          <p className="mt-2 truncate text-xs text-muted-foreground">{email}</p>
          <button type="button" onClick={signOut} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"><DoorOpen size={16} aria-hidden="true" /> Sign out</button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-7 lg:px-10">
          <div className="flex min-h-[68px] items-center justify-between gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-2 lg:hidden">
              <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-[#ffffff] p-0.5 shadow-sm">
                <Image
                  src="/student-cabinet-logo.png"
                  alt="Student Cabinet logo"
                  width={36}
                  height={36}
                  className="size-full object-contain"
                />
              </span>
              <span className="truncate text-sm font-semibold">Student Cabinet</span>
            </Link>
            <div className="hidden text-sm text-muted-foreground lg:block">Project Showcase <span className="mx-2 text-primary">/</span> Attendance control</div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden max-w-[220px] truncate text-xs text-muted-foreground sm:block">{email}</span>
              <ThemeToggle />
              <button type="button" aria-label="Sign out" onClick={signOut} className="grid size-10 place-items-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted lg:hidden"><DoorOpen size={17} aria-hidden="true" /></button>
              <Link href="/" aria-label="Back to public portal" className="grid size-10 place-items-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted"><ArrowLeft size={17} aria-hidden="true" /></Link>
            </div>
          </div>
          <nav aria-label="Mobile admin navigation" className="flex gap-2 overflow-x-auto pb-3 lg:hidden">
            {navigation.map(({ href, label }) => {
              const active = href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
              return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium transition ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>{label}</Link>
            })}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8 lg:px-10">{children}</main>
      </div>
    </div>
  )
}
