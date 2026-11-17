import { NextResponse } from 'next/server'
import { getSuperAdminUser } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } }
  )
}

/**
 * GET /api/admin/users
 * Super Admin only: List all administrators with their role, desk, and status.
 */
export async function GET() {
  const actor = await getSuperAdminUser()

  if (!actor) {
    return jsonError('Super Admin authorization required.', 403)
  }

  const supabase = createAdminClient()

  let { data, error } = await supabase
    .from('admin_profiles')
    .select('id, full_name, email, role, is_active, desk, created_at')
    .order('created_at', { ascending: true })

  if (error && error.code === '42703') {
    const legacy = await supabase
      .from('admin_profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .order('created_at', { ascending: true })

    if (legacy.error) {
      return jsonError('Could not load administrators.', 500)
    }

    data = (legacy.data ?? []).map((u) => ({ ...u, desk: null }))
  } else if (error) {
    return jsonError('Could not load administrators.', 500)
  }

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

/**
 * POST /api/admin/users
 * Super Admin only: Direct Administrator Account Creation (replaces email invitation).
 * Payload: { fullName, email, password, role, desk, isActive }
 */
export async function POST(request: Request) {
  const actor = await getSuperAdminUser()

  if (!actor) {
    return jsonError('Super Admin authorization required.', 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid request body.', 400)
  }

  if (!body || typeof body !== 'object') {
    return jsonError('Invalid request data.', 400)
  }

  const {
    fullName,
    email,
    password,
    role,
    desk,
    isActive = true,
  } = body as Record<string, unknown>

  // 1. Validate full name
  if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100) {
    return jsonError('Full name must be between 2 and 100 characters.', 400)
  }
  const normalizedName = fullName.trim()

  // 2. Validate email
  if (
    typeof email !== 'string' ||
    email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return jsonError('A valid email address is required.', 400)
  }
  const normalizedEmail = email.trim().toLowerCase()

  // 3. Validate password (never logged or stored plaintext)
  if (typeof password !== 'string' || password.length < 8) {
    return jsonError('Password must be at least 8 characters.', 400)
  }

  // 4. Validate role
  if (role !== 'admin' && role !== 'super_admin') {
    return jsonError("Role must be either 'admin' or 'super_admin'.", 400)
  }

  // 5. Validate desk based on role
  let assignedDesk: 'internal' | 'external' | null = null
  if (role === 'admin') {
    if (desk !== 'internal' && desk !== 'external') {
      return jsonError("Regular admins must be assigned to either the 'internal' or 'external' desk.", 400)
    }
    assignedDesk = desk
  } else {
    // Super Admins have access to all desks, desk must be null
    assignedDesk = null
  }

  // 6. Validate account status
  const activeStatus = typeof isActive === 'boolean' ? isActive : true

  const supabase = createAdminClient()

  // Check if email already exists in admin_profiles
  const { data: existingProfile, error: lookupError } = await supabase
    .from('admin_profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (lookupError) {
    return jsonError('Could not verify existing accounts.', 500)
  }

  if (existingProfile) {
    return jsonError('An administrator with this email address already exists.', 409)
  }

  // 7. Directly create user via Supabase Auth Admin API with email confirmed
  const { data: createdAuth, error: authError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: normalizedName,
    },
  })

  if (authError || !createdAuth.user) {
    return jsonError(authError?.message || 'Could not create authentication user.', 400)
  }

  const userId = createdAuth.user.id

  // 8. Insert into admin_profiles
  const profilePayload: Record<string, unknown> = {
    id: userId,
    full_name: normalizedName,
    email: normalizedEmail,
    role,
    desk: assignedDesk,
    is_active: activeStatus,
  }

  let { error: insertError } = await supabase
    .from('admin_profiles')
    .insert(profilePayload)

  if (insertError && insertError.code === '42703') {
    delete profilePayload.desk
    const retry = await supabase.from('admin_profiles').insert(profilePayload)
    insertError = retry.error
  }

  if (insertError) {
    await supabase.auth.admin.deleteUser(userId)
    return jsonError('Could not save administrator profile. Auth creation rolled back.', 500)
  }

  // 9. Record in admin_audit_logs
  const auditPayload: Record<string, unknown> = {
    actor_id: actor.id,
    actor_email: actor.email ?? 'unknown',
    target_admin_id: userId,
    target_email: normalizedEmail,
    action_type: 'CREATE',
    previous_role: null,
    new_role: role,
    reason: `Direct administrator creation with role '${role}' and desk '${assignedDesk ?? 'all'}'`,
  }

  const auditRes = await supabase.from('admin_audit_logs').insert(auditPayload)
  if (auditRes.error) {
    console.warn('Could not record CREATE audit log:', auditRes.error)
  }

  return NextResponse.json(
    {
      success: true,
      message: `Administrator ${normalizedName} created successfully.`,
      user: {
        id: userId,
        full_name: normalizedName,
        email: normalizedEmail,
        role,
        desk: assignedDesk,
        is_active: activeStatus,
      },
    },
    { status: 201, headers: { 'Cache-Control': 'no-store' } }
  )
}

/**
 * PATCH /api/admin/users
 * Super Admin only: Update full name, role, desk assignment, or account status.
 * Payload: { userId, fullName, role, desk, isActive, actionTypeOverride, reason }
 */
export async function PATCH(request: Request) {
  const actor = await getSuperAdminUser()

  if (!actor) {
    return jsonError('Super Admin authorization required.', 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid request body.', 400)
  }

  if (!body || typeof body !== 'object') {
    return jsonError('Invalid request data.', 400)
  }

  const {
    userId,
    fullName,
    role,
    desk,
    isActive,
    actionTypeOverride,
    reason,
  } = body as Record<string, unknown>

  if (typeof userId !== 'string' || !userId) {
    return jsonError('A valid user ID is required.', 400)
  }

  const changingName = fullName !== undefined
  const changingRole = role !== undefined
  const changingDesk = desk !== undefined
  const changingStatus = isActive !== undefined
  const isAccessRemoval = actionTypeOverride === 'ACCESS_REMOVAL'

  if (!changingName && !changingRole && !changingDesk && !changingStatus && !isAccessRemoval) {
    return jsonError('No updates provided. Specify fullName, role, desk, or account status.', 400)
  }

  // Rule: Prevent self-promotion or self-editing of role, desk, or status
  if (actor.id === userId) {
    if (changingRole || changingDesk || (changingStatus && isActive === false) || isAccessRemoval) {
      return jsonError('Security violation: Administrators cannot modify their own role, desk, or active status.', 403)
    }
  }

  if (changingName && (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 100)) {
    return jsonError('Full name must be between 2 and 100 characters.', 400)
  }

  if (changingRole && !['admin', 'super_admin'].includes(String(role))) {
    return jsonError('Invalid administrator role.', 400)
  }

  if (changingDesk && desk !== null && desk !== 'internal' && desk !== 'external') {
    return jsonError("Desk must be 'internal', 'external', or null.", 400)
  }

  if (changingStatus && typeof isActive !== 'boolean') {
    return jsonError('Invalid account status.', 400)
  }

  if (reason !== undefined && (typeof reason !== 'string' || reason.trim().length > 500)) {
    return jsonError('Reason must be 500 characters or fewer.', 400)
  }

  const supabase = createAdminClient()

  // Fetch current target admin
  let { data: target, error: lookupError } = await supabase
    .from('admin_profiles')
    .select('id, full_name, email, role, is_active, desk')
    .eq('id', userId)
    .maybeSingle()

  if (lookupError && lookupError.code === '42703') {
    const legacy = await supabase
      .from('admin_profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', userId)
      .maybeSingle()
    if (legacy.data) {
      target = { ...legacy.data, desk: null }
      lookupError = null
    }
  }

  if (lookupError || !target) {
    return jsonError('Administrator not found.', 404)
  }

  const newName = changingName ? String(fullName).trim() : target.full_name
  const newRole = changingRole ? (String(role) as 'admin' | 'super_admin') : target.role
  let newDesk: 'internal' | 'external' | null = target.desk

  if (newRole === 'super_admin') {
    newDesk = null
  } else if (changingDesk) {
    newDesk = desk as 'internal' | 'external' | null
    if (!newDesk) {
      return jsonError("Regular admins must have an assigned desk ('internal' or 'external').", 400)
    }
  } else if (changingRole && target.role === 'super_admin' && newRole === 'admin') {
    // Demoted to admin: must provide desk
    if (desk === 'internal' || desk === 'external') {
      newDesk = desk
    } else {
      return jsonError("Please specify an assigned desk ('internal' or 'external') for regular admins.", 400)
    }
  }

  const newActive = isAccessRemoval
    ? false
    : changingStatus
      ? Boolean(isActive)
      : target.is_active

  // Enforce Last Active Super Admin Protection
  if (
    target.role === 'super_admin' &&
    target.is_active &&
    (newRole !== 'super_admin' || !newActive || isAccessRemoval)
  ) {
    const { count, error: countError } = await supabase
      .from('admin_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'super_admin')
      .eq('is_active', true)

    if (countError) {
      return jsonError('Could not verify active Super Admins.', 500)
    }

    if ((count ?? 0) <= 1) {
      return jsonError('The last active Super Admin cannot be demoted, deactivated, or removed.', 409)
    }
  }

  // Determine primary action type for audit logging
  let actionType = 'PROFILE_EDIT'
  if (isAccessRemoval) {
    actionType = 'ACCESS_REMOVAL'
  } else if (changingStatus) {
    actionType = newActive ? 'REACTIVATE' : 'DEACTIVATE'
  } else if (changingRole) {
    actionType = 'ROLE_CHANGE'
  } else if (changingDesk) {
    actionType = 'DESK_CHANGE'
  }

  const updateFields: Record<string, unknown> = {
    full_name: newName,
    role: newRole,
    desk: newDesk,
    is_active: newActive,
  }

  let { error: updateError } = await supabase
    .from('admin_profiles')
    .update(updateFields)
    .eq('id', userId)

  if (updateError && updateError.code === '42703') {
    delete updateFields.desk
    const retry = await supabase.from('admin_profiles').update(updateFields).eq('id', userId)
    updateError = retry.error
  }

  if (updateError) {
    return jsonError('Could not update the administrator.', 500)
  }

  // Record change in audit logs
  const auditEntry: Record<string, unknown> = {
    actor_id: actor.id,
    actor_email: actor.email ?? 'unknown',
    target_admin_id: target.id,
    target_email: target.email,
    action_type: actionType,
    previous_role: target.role,
    new_role: newRole,
    reason: typeof reason === 'string' && reason.trim()
      ? reason.trim()
      : actionType === 'ACCESS_REMOVAL'
        ? 'Administrative access revoked and account deactivated'
        : changingDesk
          ? `Desk changed from ${target.desk ?? 'none'} to ${newDesk}`
          : changingName
            ? `Name updated from ${target.full_name} to ${newName}`
            : null,
  }

  const auditRes = await supabase.from('admin_audit_logs').insert(auditEntry)
  if (auditRes.error) {
    console.warn('Could not record admin audit log:', auditRes.error)
  }

  return NextResponse.json({
    success: true,
    message: isAccessRemoval
      ? 'Administrator access revoked successfully.'
      : 'Administrator updated successfully.',
  })
}
