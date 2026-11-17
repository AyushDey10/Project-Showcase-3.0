import 'server-only'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type AdminRole = 'admin' | 'super_admin'
export type AdminDesk = 'internal' | 'external' | null

export type AdminProfile = {
  id: string
  email: string | null
  full_name: string | null
  role: AdminRole
  desk: AdminDesk
  is_active: boolean
}

export type AdminSession = {
  user: User
  profile: AdminProfile
}

async function getAuthorizedSession(requiredRole?: 'super_admin'): Promise<AdminSession | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return null

  // Attempt to select desk along with standard profile fields.
  // If desk column does not exist yet (pending migration), gracefully fallback.
  let profileData: {
    id: string
    email: string | null
    full_name: string | null
    role: string
    is_active: boolean
    desk?: string | null
  } | null = null

  const { data: fullProfile, error: profileError } = await supabase
    .from('admin_profiles')
    .select('id, email, full_name, role, is_active, desk')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError && profileError.code === '42703') {
    // Column desk does not exist yet; fallback to querying without desk
    const { data: legacyProfile, error: legacyError } = await supabase
      .from('admin_profiles')
      .select('id, email, full_name, role, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (legacyError || !legacyProfile) {
      return null
    }
    profileData = { ...legacyProfile, desk: null }
  } else if (profileError || !fullProfile) {
    return null
  } else {
    profileData = fullProfile
  }

  if (
    !profileData.is_active ||
    !['admin', 'super_admin'].includes(profileData.role)
  ) {
    return null
  }

  if (requiredRole && profileData.role !== requiredRole) {
    return null
  }

  const role = profileData.role as AdminRole
  let desk: AdminDesk = null

  if (role === 'admin') {
    if (profileData.desk === 'internal' || profileData.desk === 'external') {
      desk = profileData.desk
    } else {
      // Default or unassigned if migration not yet applied
      desk = null
    }
  }

  return {
    user,
    profile: {
      id: profileData.id,
      email: profileData.email ?? user.email ?? null,
      full_name: profileData.full_name ?? user.user_metadata?.full_name ?? null,
      role,
      desk,
      is_active: Boolean(profileData.is_active),
    },
  }
}

export async function getAdminUser(): Promise<User | null> {
  const session = await getAuthorizedSession()
  return session ? session.user : null
}

export async function getSuperAdminUser(): Promise<User | null> {
  const session = await getAuthorizedSession('super_admin')
  return session ? session.user : null
}

export async function getAdminSession(): Promise<AdminSession | null> {
  return getAuthorizedSession()
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession()

  if (!session) redirect('/admin/login')

  return session
}

export async function requireSuperAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession()

  if (!session) redirect('/admin/login')
  if (session.profile.role !== 'super_admin') redirect('/admin')

  return session
}

export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser()

  if (!user) redirect('/admin/login')

  return user
}

export function isSuperAdmin(profile: AdminProfile): boolean {
  return profile.role === 'super_admin'
}
