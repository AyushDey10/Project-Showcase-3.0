'use client'

import React from 'react'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import type { AdminProfile, AdminSession } from '@/lib/auth/admin'

export interface AdminFrameProps {
  children: React.ReactNode
  email?: string
  profile?: AdminProfile
  session?: AdminSession
}

export function AdminFrame({ children, email, profile, session }: AdminFrameProps) {
  // If complete session provided, use it
  if (session) {
    return <AdminLayout session={session}>{children}</AdminLayout>
  }

  // Fallback constructed session if only email or profile provided
  const resolvedProfile: AdminProfile = profile ?? {
    id: 'admin',
    email: email ?? 'admin@projectshowcase.bu',
    full_name: null,
    role: 'admin',
    desk: 'internal',
    is_active: true,
  }

  const resolvedSession: AdminSession = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: { id: resolvedProfile.id, email: resolvedProfile.email } as any,
    profile: resolvedProfile,
  }

  return <AdminLayout session={resolvedSession}>{children}</AdminLayout>
}
