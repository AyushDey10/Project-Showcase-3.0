import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
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

export type AdminSessionUser = {
  id: string
  email: string | null
}

export type AdminSession = {
  user: AdminSessionUser
  profile: AdminProfile
}

/**
 * Verifies the caller's identity once per request.
 *
 * `getClaims()` validates the JWT signature locally when the project uses
 * asymmetric signing keys and transparently falls back to the Auth server for
 * symmetric (HS*) tokens, so the security guarantee is identical to `getUser()`
 * while most requests no longer pay an auth round trip. Only `sub` and `email`
 * are ever read from the session downstream.
 */
async function loadVerifiedUser(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<AdminSessionUser | null> {
  try {
    const { data, error } = await supabase.auth.getClaims()
    if (!error && data?.claims?.sub) {
      const claims = data.claims as { sub: string; email?: string }
      return { id: claims.sub, email: claims.email ?? null }
    }
  } catch {
    // Fall through to the authoritative server-side lookup below.
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return null
  return { id: user.id, email: user.email ?? null }
}

async function loadAdminSession(): Promise<AdminSession | null> {
  const supabase = await createClient()

  const user = await loadVerifiedUser(supabase)

  if (!user) return null

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
      full_name: profileData.full_name ?? null,
      role,
      desk,
      is_active: Boolean(profileData.is_active),
    },
  }
}

/**
 * Request-scoped session lookup.
 *
 * The workspace layout, the page it renders and any nested server component all
 * need the same admin profile. Without memoisation each of them performs its own
 * `auth.getUser()` round trip plus an `admin_profiles` query, which is the single
 * largest cost of an admin navigation. `cache()` keeps exactly one lookup per
 * request (and stays a plain function call in route handlers), so authorisation
 * behaviour is unchanged while the redundant network work disappears.
 */
const getSessionOnce = cache(loadAdminSession)

export async function getAdminSession(): Promise<AdminSession | null> {
  return getSessionOnce()
}

export async function getAdminUser(): Promise<AdminSessionUser | null> {
  const session = await getSessionOnce()
  return session ? session.user : null
}

export async function getSuperAdminUser(): Promise<AdminSessionUser | null> {
  const session = await getSessionOnce()
  if (!session || session.profile.role !== 'super_admin') return null
  return session.user
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getSessionOnce()

  if (!session) redirect('/admin/login')

  return session
}

export async function requireSuperAdminSession(): Promise<AdminSession> {
  const session = await getSessionOnce()

  if (!session) redirect('/admin/login')
  if (session.profile.role !== 'super_admin') redirect('/admin')

  return session
}

export async function requireAdmin(): Promise<AdminSessionUser> {
  const user = await getAdminUser()

  if (!user) redirect('/admin/login')

  return user
}

export function isSuperAdmin(profile: AdminProfile): boolean {
  return profile.role === 'super_admin'
}
