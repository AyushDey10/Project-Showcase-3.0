import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { canEditRegistration } from '@/lib/teams/classification'
import { invalidateRegistrationCache } from '@/lib/supabase/event-cache'
import { enqueueSheetsSync } from '@/lib/sheets/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } }
  )
}

/**
 * POST /api/admin/teams/[id]/students
 * Super Admin only: Add a new student member to a team.
 * Payload: { name, enrollment_no, mobile, email, role }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()

  if (!session) {
    return jsonError('Admin authorization required.', 403)
  }

  if (!canEditRegistration(session.profile)) {
    return jsonError('Super Admin authorization required to add team members.', 403)
  }

  const { id: teamId } = await params
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid request body.', 400)
  }

  if (!body || typeof body !== 'object') {
    return jsonError('Invalid request data.', 400)
  }

  const { name, enrollment_no, mobile, email, role } = body as Record<string, unknown>

  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return jsonError('Student name must be between 2 and 100 characters.', 400)
  }

  const normalizedName = name.trim()
  const normalizedEnrollment = typeof enrollment_no === 'string' && enrollment_no.trim() ? enrollment_no.trim() : null
  const normalizedMobile = typeof mobile === 'string' && mobile.trim() ? mobile.trim() : null
  const normalizedEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null
  const normalizedRole = typeof role === 'string' && role.trim() ? role.trim() : 'Member'

  if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return jsonError('Invalid student email address.', 400)
  }

  const supabase = createAdminClient()

  // Verify team exists
  const { data: team, error: teamLookupError } = await supabase
    .from('teams')
    .select('id, team_size')
    .eq('id', teamId)
    .maybeSingle()

  if (teamLookupError || !team) {
    return jsonError('Team not found.', 404)
  }

  // Check for duplicate enrollment number if provided
  if (normalizedEnrollment) {
    const { data: existingStudent, error: checkError } = await supabase
      .from('students')
      .select('id, team_id')
      .eq('enrollment_no', normalizedEnrollment)
      .maybeSingle()

    if (existingStudent) {
      return jsonError(`Enrollment number ${normalizedEnrollment} is already registered to a student.`, 409)
    }
  }

  // Insert student into students table (team_id explicitly linked)
  const { data: newStudent, error: insertError } = await supabase
    .from('students')
    .insert({
      team_id: teamId,
      name: normalizedName,
      enrollment_no: normalizedEnrollment,
      mobile: normalizedMobile,
      email: normalizedEmail,
      role: normalizedRole,
    })
    .select()
    .single()

  if (insertError) {
    return jsonError('Could not add student to team.', 500)
  }

  // Increment team_size in teams table
  const newSize = (team.team_size ?? 0) + 1
  await supabase.from('teams').update({ team_size: newSize }).eq('id', teamId)

  // Invalidate registration cache so team directory and dashboard update immediately
  invalidateRegistrationCache()

  // Enqueue Google Sheets synchronization
  enqueueSheetsSync({
    entityType: 'student',
    entityId: newStudent.id,
    action: 'UPSERT',
    payload: { teamId, studentId: newStudent.id },
  }).catch(() => {})

  return NextResponse.json(
    {
      success: true,
      message: `Student ${normalizedName} added to team successfully.`,
      student: newStudent,
    },
    { status: 201, headers: { 'Cache-Control': 'no-store' } }
  )
}

/**
 * PATCH /api/admin/teams/[id]/students
 * Super Admin only: Edit an existing student member's details.
 * Payload: { studentId, name, enrollment_no, mobile, email, role }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()

  if (!session) {
    return jsonError('Admin authorization required.', 403)
  }

  if (!canEditRegistration(session.profile)) {
    return jsonError('Super Admin authorization required to edit team members.', 403)
  }

  const { id: teamId } = await params
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid request body.', 400)
  }

  if (!body || typeof body !== 'object') {
    return jsonError('Invalid request data.', 400)
  }

  const { studentId, name, enrollment_no, mobile, email, role } = body as Record<string, unknown>

  if (typeof studentId !== 'string' || !studentId) {
    return jsonError('Student ID is required.', 400)
  }

  const updates: Record<string, unknown> = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return jsonError('Student name must be between 2 and 100 characters.', 400)
    }
    updates.name = name.trim()
  }

  if (enrollment_no !== undefined) {
    updates.enrollment_no = typeof enrollment_no === 'string' && enrollment_no.trim() ? enrollment_no.trim() : null
  }

  if (mobile !== undefined) {
    updates.mobile = typeof mobile === 'string' && mobile.trim() ? mobile.trim() : null
  }

  if (email !== undefined) {
    const normEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null
    if (normEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
      return jsonError('Invalid student email address.', 400)
    }
    updates.email = normEmail
  }

  if (role !== undefined) {
    updates.role = typeof role === 'string' && role.trim() ? role.trim() : 'Member'
  }

  if (Object.keys(updates).length === 0) {
    return jsonError('No updates provided.', 400)
  }

  const supabase = createAdminClient()

  // Verify student exists and belongs to this team
  const { data: currentStudent, error: lookupError } = await supabase
    .from('students')
    .select('id, team_id, enrollment_no')
    .eq('id', studentId)
    .eq('team_id', teamId)
    .maybeSingle()

  if (lookupError || !currentStudent) {
    return jsonError('Student not found in this team.', 404)
  }

  // Check for duplicate enrollment number if changing
  if (updates.enrollment_no && updates.enrollment_no !== currentStudent.enrollment_no) {
    const { data: duplicateCheck } = await supabase
      .from('students')
      .select('id')
      .eq('enrollment_no', updates.enrollment_no)
      .neq('id', studentId)
      .maybeSingle()

    if (duplicateCheck) {
      return jsonError(`Enrollment number ${updates.enrollment_no} is already registered to another student.`, 409)
    }
  }

  const { error: updateError } = await supabase
    .from('students')
    .update(updates)
    .eq('id', studentId)
    .eq('team_id', teamId)

  if (updateError) {
    return jsonError('Could not update student details.', 500)
  }

  invalidateRegistrationCache()

  enqueueSheetsSync({
    entityType: 'student',
    entityId: studentId,
    action: 'UPSERT',
    payload: { teamId, studentId },
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    message: 'Student details updated successfully.',
  })
}

/**
 * DELETE /api/admin/teams/[id]/students
 * Super Admin only: Remove a student member from a team.
 * Query or body: studentId
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()

  if (!session) {
    return jsonError('Admin authorization required.', 401)
  }

  if (!canEditRegistration(session.profile)) {
    return jsonError('Super Admin authorization required to remove team members.', 403)
  }

  const { id: teamId } = await params
  const url = new URL(request.url)
  let studentId = url.searchParams.get('studentId')

  if (!studentId) {
    try {
      const body = await request.json()
      studentId = body?.studentId
    } catch {}
  }

  if (!studentId || typeof studentId !== 'string') {
    return jsonError('Student ID is required.', 400)
  }

  const supabase = createAdminClient()

  // Verify student exists and belongs to this team
  const { data: student, error: lookupError } = await supabase
    .from('students')
    .select('id, team_id, name')
    .eq('id', studentId)
    .eq('team_id', teamId)
    .maybeSingle()

  if (lookupError || !student) {
    return jsonError('Student not found in this team.', 404)
  }

  // Count remaining students in team
  const { count: studentCount } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)

  if ((studentCount ?? 0) <= 1) {
    return jsonError('Cannot remove the only member of a team. A team must have at least one registered student.', 400)
  }

  const { error: deleteError } = await supabase
    .from('students')
    .delete()
    .eq('id', studentId)
    .eq('team_id', teamId)

  if (deleteError) {
    return jsonError('Could not remove student from team.', 500)
  }

  // Update team_size in teams table
  const newSize = Math.max(1, (studentCount ?? 2) - 1)
  await supabase.from('teams').update({ team_size: newSize }).eq('id', teamId)

  invalidateRegistrationCache()

  enqueueSheetsSync({
    entityType: 'student',
    entityId: studentId,
    action: 'DELETE',
    payload: { teamId, studentId },
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    message: `Student ${student.name} removed from team successfully.`,
  })
}
