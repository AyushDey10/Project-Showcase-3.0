import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Monitor } from 'lucide-react'
import { requireAdminSession } from '@/lib/auth/admin'
import { PageContainer } from '@/components/admin/page-container'
import { StatusBadge } from '@/components/admin/status-badge'
import { DashboardSections } from '@/components/admin/dashboard-sections'
import { DashboardLoadingSkeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Dashboard — Project Showcase 3.0',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const session = await requireAdminSession()
  const { profile } = session

  const isSuper = profile.role === 'super_admin'
  const deskScope = profile.role === 'admin' ? profile.desk : 'all'

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
      {/* Metrics stream in behind the page frame so the layout is never blank. */}
      <Suspense fallback={<DashboardLoadingSkeleton />}>
        <DashboardSections profile={profile} />
      </Suspense>
    </PageContainer>
  )
}
