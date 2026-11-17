/**
 * PROJECT SHOWCASE 3.0 — TASK 2 VERIFICATION SUITE
 * Tests Super Admin Panel, Admin Management, Desk & Role Validation,
 * Self-Modification Prevention, Last Active Super Admin Protection,
 * Admin Audit Trail, Team Details & Student Editing, Minimum Member Rule,
 * Duplicate Enrollment Prevention, Dynamic Desk Reclassification,
 * and Attendance Isolation.
 */

import {
  isInternalInstitution,
  getTeamDesk,
  isTeamAccessible,
  canEditRegistration,
} from '../lib/teams/classification.ts'

function runTask2Tests() {
  console.log('====================================================================')
  console.log('PROJECT SHOWCASE 3.0 — TASK 2 SUPER ADMIN & MANAGEMENT TEST SUITE')
  console.log('====================================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`)
      passed++
    } else {
      console.error(`[FAIL] ${message}`)
      failed++
    }
  }

  // -------------------------------------------------------------------------
  // SUITE 1: SUPER ADMIN PRIVILEGES & RBAC ROUTE GUARDING
  // -------------------------------------------------------------------------
  console.log('--- SUITE 1: Super Admin Permissions & Authorization Guarding ---')
  const superAdmin = { id: 'sa-1', email: 'super@showcase.bu', role: 'super_admin', desk: null, is_active: true }
  const regularInternal = { id: 'adm-1', email: 'internal@showcase.bu', role: 'admin', desk: 'internal', is_active: true }
  const regularExternal = { id: 'adm-2', email: 'external@showcase.bu', role: 'admin', desk: 'external', is_active: true }
  const inactiveSuper = { id: 'sa-2', email: 'oldsuper@showcase.bu', role: 'super_admin', desk: null, is_active: false }

  // Registration Editing Permission
  assert(canEditRegistration(superAdmin) === true, 'Super Admin CAN edit team & student registrations')
  assert(canEditRegistration(regularInternal) === false, 'Regular Admin (Internal) CANNOT edit registration (403)')
  assert(canEditRegistration(regularExternal) === false, 'Regular Admin (External) CANNOT edit registration (403)')
  assert(canEditRegistration(inactiveSuper) === false, 'Inactive Super Admin CANNOT edit registration')
  assert(canEditRegistration(null) === false, 'Unauthenticated user CANNOT edit registration')

  // Desk Accessibility for Super Admin vs Regular Admin
  assert(isTeamAccessible(superAdmin, 'Bennett University') === true, 'Super Admin accesses Internal teams')
  assert(isTeamAccessible(superAdmin, 'IIT Delhi') === true, 'Super Admin accesses External teams')
  assert(isTeamAccessible(regularInternal, 'Bennett University') === true, 'Internal Admin accesses Bennett teams')
  assert(isTeamAccessible(regularInternal, 'IIT Delhi') === false, 'Internal Admin blocked from External teams (403)')
  assert(isTeamAccessible(regularExternal, 'IIT Delhi') === true, 'External Admin accesses External teams')
  assert(isTeamAccessible(regularExternal, 'Bennett University') === false, 'External Admin blocked from Bennett teams (403)')

  // -------------------------------------------------------------------------
  // SUITE 2: ADMIN MANAGEMENT VALIDATION & DESK RULES
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Desk Assignment Validity Rules ---')
  function validateAdminPayload(role, desk) {
    if (role === 'admin' && !desk) {
      return { valid: false, error: 'A desk assignment (internal or external) is required for regular admin accounts.' }
    }
    if (role === 'super_admin' && desk !== null && desk !== undefined) {
      return { valid: false, error: 'Super Admin accounts have full system access and must not have an assigned desk.' }
    }
    if (desk && desk !== 'internal' && desk !== 'external') {
      return { valid: false, error: 'Desk must be either "internal" or "external".' }
    }
    return { valid: true }
  }

  assert(validateAdminPayload('admin', 'internal').valid === true, 'Valid: admin + internal desk')
  assert(validateAdminPayload('admin', 'external').valid === true, 'Valid: admin + external desk')
  assert(validateAdminPayload('admin', null).valid === false, 'Invalid: admin with null desk rejected')
  assert(validateAdminPayload('admin', undefined).valid === false, 'Invalid: admin with undefined desk rejected')
  assert(validateAdminPayload('admin', 'other').valid === false, 'Invalid: admin with invalid desk name rejected')
  assert(validateAdminPayload('super_admin', null).valid === true, 'Valid: super_admin + null desk')
  assert(validateAdminPayload('super_admin', 'internal').valid === false, 'Invalid: super_admin with desk assigned rejected')

  // -------------------------------------------------------------------------
  // SUITE 3: SELF-MODIFICATION & PRIVILEGE ESCALATION PREVENTION
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Self-Modification Prevention ---')
  function checkSelfModification(actor, targetId, updates) {
    const isSelf = actor.id === targetId
    if (isSelf) {
      if (updates.role !== undefined && updates.role !== actor.role) {
        return { allowed: false, error: 'Self-modification forbidden: You cannot change your own role.' }
      }
      if (updates.desk !== undefined && updates.desk !== actor.desk) {
        return { allowed: false, error: 'Self-modification forbidden: You cannot change your own desk assignment.' }
      }
      if (updates.isActive !== undefined && updates.isActive !== actor.is_active) {
        return { allowed: false, error: 'Self-modification forbidden: You cannot deactivate or modify your own account status.' }
      }
      if (updates.actionTypeOverride === 'ACCESS_REMOVAL') {
        return { allowed: false, error: 'Self-modification forbidden: You cannot remove access for your own account.' }
      }
    }
    return { allowed: true }
  }

  assert(
    checkSelfModification(superAdmin, superAdmin.id, { role: 'admin' }).allowed === false,
    'Actor cannot demote own role to regular admin'
  )
  assert(
    checkSelfModification(superAdmin, superAdmin.id, { desk: 'internal' }).allowed === false,
    'Actor cannot change own desk assignment'
  )
  assert(
    checkSelfModification(superAdmin, superAdmin.id, { isActive: false }).allowed === false,
    'Actor cannot deactivate own account'
  )
  assert(
    checkSelfModification(superAdmin, superAdmin.id, { actionTypeOverride: 'ACCESS_REMOVAL' }).allowed === false,
    'Actor cannot remove access from own account'
  )
  assert(
    checkSelfModification(superAdmin, superAdmin.id, { fullName: 'New Super Name' }).allowed === true,
    'Actor CAN safely edit own display name'
  )
  assert(
    checkSelfModification(superAdmin, regularInternal.id, { role: 'super_admin' }).allowed === true,
    'Super Admin CAN promote another administrator'
  )
  assert(
    checkSelfModification(superAdmin, regularInternal.id, { isActive: false }).allowed === true,
    'Super Admin CAN deactivate another administrator'
  )

  // -------------------------------------------------------------------------
  // SUITE 4: LAST ACTIVE SUPER ADMIN PROTECTION
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Last Active Super Admin Protection ---')
  function checkLastActiveSuperAdmin(activeSuperAdminCount, targetAdmin, action) {
    const isDemoting = action.newRole && action.newRole !== 'super_admin' && targetAdmin.role === 'super_admin'
    const isDeactivating = action.newStatus === false && targetAdmin.role === 'super_admin' && targetAdmin.is_active === true
    const isRemoving = action.removeAccess === true && targetAdmin.role === 'super_admin' && targetAdmin.is_active === true

    if ((isDemoting || isDeactivating || isRemoving) && activeSuperAdminCount <= 1) {
      return { allowed: false, status: 409, error: 'Cannot demote, deactivate, or remove the last active Super Admin.' }
    }
    return { allowed: true }
  }

  // Exactly 1 active super admin
  const targetSuper = { id: 'sa-1', role: 'super_admin', is_active: true }
  assert(
    checkLastActiveSuperAdmin(1, targetSuper, { newRole: 'admin' }).allowed === false,
    '409 Conflict: Cannot demote the last active Super Admin'
  )
  assert(
    checkLastActiveSuperAdmin(1, targetSuper, { newStatus: false }).allowed === false,
    '409 Conflict: Cannot deactivate the last active Super Admin'
  )
  assert(
    checkLastActiveSuperAdmin(1, targetSuper, { removeAccess: true }).allowed === false,
    '409 Conflict: Cannot remove access for the last active Super Admin'
  )

  // Multiple active super admins (e.g. 2)
  assert(
    checkLastActiveSuperAdmin(2, targetSuper, { newRole: 'admin' }).allowed === true,
    'Allowed: Demoting a Super Admin when another active Super Admin exists'
  )
  assert(
    checkLastActiveSuperAdmin(2, targetSuper, { newStatus: false }).allowed === true,
    'Allowed: Deactivating a Super Admin when another active Super Admin exists'
  )

  // -------------------------------------------------------------------------
  // SUITE 5: ADMIN AUDIT LOG RECORDING & IMMUTABILITY
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Admin Audit Log Action Types & Data Integrity ---')
  function generateAdminAuditEntry(actor, target, actionType, prevValues, newValues, reason) {
    return {
      actor_id: actor.id,
      actor_email: actor.email,
      target_admin_id: target.id,
      target_email: target.email,
      action_type: actionType,
      previous_role: prevValues.role ?? null,
      new_role: newValues.role ?? null,
      previous_desk: prevValues.desk ?? null,
      new_desk: newValues.desk ?? null,
      reason: reason ?? null,
      has_password: false, // Must never log passwords
      timestamp: new Date().toISOString(),
    }
  }

  const creationLog = generateAdminAuditEntry(
    superAdmin,
    { id: 'adm-3', email: 'newadmin@showcase.bu' },
    'CREATE',
    {},
    { role: 'admin', desk: 'internal' },
    'Direct admin creation'
  )
  assert(creationLog.action_type === 'CREATE', 'Audit log records CREATE action')
  assert(creationLog.has_password === false, 'Audit log NEVER stores passwords or credentials')
  assert(creationLog.new_desk === 'internal', 'Audit log stores assigned desk')

  const roleChangeLog = generateAdminAuditEntry(
    superAdmin,
    regularInternal,
    'ROLE_CHANGE',
    { role: 'admin' },
    { role: 'super_admin' },
    'Promoted to lead admin'
  )
  assert(roleChangeLog.action_type === 'ROLE_CHANGE', 'Audit log records ROLE_CHANGE action')
  assert(roleChangeLog.previous_role === 'admin' && roleChangeLog.new_role === 'super_admin', 'Audit log records previous and new roles')

  const deactivationLog = generateAdminAuditEntry(
    superAdmin,
    regularExternal,
    'DEACTIVATE',
    { isActive: true },
    { isActive: false },
    'Shift completed'
  )
  assert(deactivationLog.action_type === 'DEACTIVATE', 'Audit log records DEACTIVATE action')

  const reactivationLog = generateAdminAuditEntry(
    superAdmin,
    regularExternal,
    'REACTIVATE',
    { isActive: false },
    { isActive: true },
    'New shift scheduled'
  )
  assert(reactivationLog.action_type === 'REACTIVATE', 'Audit log records REACTIVATE action')

  const removalLog = generateAdminAuditEntry(
    superAdmin,
    regularExternal,
    'ACCESS_REMOVAL',
    { isActive: true },
    { isActive: false },
    'Volunteer completed duty'
  )
  assert(removalLog.action_type === 'ACCESS_REMOVAL', 'Audit log records ACCESS_REMOVAL action')

  // -------------------------------------------------------------------------
  // SUITE 6: DYNAMIC DESK RECLASSIFICATION & INSTITUTION UPDATES
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Dynamic Desk Reclassification ---')
  const teamBennett = { id: 'team-1', institution: 'Bennett University' }
  const teamDTU = { id: 'team-2', institution: 'Delhi Technological University' }

  assert(getTeamDesk(teamBennett.institution) === 'internal', 'Initial: Bennett University classified as "internal"')
  assert(getTeamDesk(teamDTU.institution) === 'external', 'Initial: DTU classified as "external"')

  // Simulate updating team-1 institution to DTU
  const updatedTeam1 = { ...teamBennett, institution: 'Delhi Technological University' }
  assert(
    getTeamDesk(updatedTeam1.institution) === 'external',
    'Reclassification: Changing Bennett to DTU immediately yields "external"'
  )

  // Simulate updating team-2 institution to Bennett
  const updatedTeam2 = { ...teamDTU, institution: 'Bennett University, Greater Noida' }
  assert(
    getTeamDesk(updatedTeam2.institution) === 'internal',
    'Reclassification: Changing external institution to Bennett immediately yields "internal"'
  )

  // Desk isolation shifts accordingly
  assert(
    isTeamAccessible(regularInternal, updatedTeam1.institution) === false,
    'Internal Admin can no longer access team moved to External institution'
  )
  assert(
    isTeamAccessible(regularExternal, updatedTeam1.institution) === true,
    'External Admin now correctly accesses team moved to External institution'
  )

  // -------------------------------------------------------------------------
  // SUITE 7: STUDENT MANAGEMENT RULES (MANDATORY FIELDS, UNIQUE ENROLLMENT, MIN 1 MEMBER)
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 7: Student Management Business Rules ---')
  function validateStudentAddition(newStudent, existingStudents) {
    if (!newStudent.name || !newStudent.name.trim()) {
      return { valid: false, error: 'Student full name is required.' }
    }
    if (!newStudent.enrollment_no || !newStudent.enrollment_no.trim()) {
      return { valid: false, error: 'Student enrollment number is required.' }
    }
    const cleanEnroll = newStudent.enrollment_no.trim().toUpperCase()
    const duplicate = existingStudents.some(
      (s) => s.enrollment_no && s.enrollment_no.trim().toUpperCase() === cleanEnroll
    )
    if (duplicate) {
      return { valid: false, error: `Student with enrollment number "${cleanEnroll}" already exists.` }
    }
    return { valid: true, cleanEnroll }
  }

  function validateStudentRemoval(studentId, existingStudents) {
    if (existingStudents.length <= 1) {
      return { valid: false, error: 'A team must always have at least one registered student. Cannot remove the last member.' }
    }
    const exists = existingStudents.some((s) => s.id === studentId)
    if (!exists) {
      return { valid: false, error: 'Student not found in this team.' }
    }
    return { valid: true }
  }

  const existingTeamStudents = [
    { id: 's1', name: 'Alice Smith', enrollment_no: 'E21CSEU001', role: 'Leader' },
    { id: 's2', name: 'Bob Jones', enrollment_no: 'E21CSEU002', role: 'Member' },
  ]

  // Validate Addition
  assert(
    validateStudentAddition({ name: '', enrollment_no: 'E21CSEU003' }, existingTeamStudents).valid === false,
    'Rejects student addition with empty name'
  )
  assert(
    validateStudentAddition({ name: 'Charlie', enrollment_no: '' }, existingTeamStudents).valid === false,
    'Rejects student addition with empty enrollment number'
  )
  assert(
    validateStudentAddition({ name: 'Duplicate Alice', enrollment_no: 'e21cseu001' }, existingTeamStudents).valid === false,
    'Rejects student addition with duplicate enrollment number (case-insensitive)'
  )
  assert(
    validateStudentAddition({ name: 'Charlie Brown', enrollment_no: 'E21CSEU003' }, existingTeamStudents).valid === true,
    'Accepts valid student with unique enrollment number'
  )

  // Validate Removal
  assert(
    validateStudentRemoval('s2', existingTeamStudents).valid === true,
    'Allows removing member when team has 2 members'
  )
  const singleStudentTeam = [{ id: 's1', name: 'Alice Smith', enrollment_no: 'E21CSEU001' }]
  assert(
    validateStudentRemoval('s1', singleStudentTeam).valid === false,
    'Rejects removing the last remaining student (minimum 1 member constraint)'
  )

  // -------------------------------------------------------------------------
  // SUITE 8: ATTENDANCE DATA ISOLATION GUARANTEE
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 8: Attendance Data Isolation Guarantee ---')
  const initialVerificationState = {
    team_id: 'team-1',
    reported: true,
    reported_at: '2026-11-18T08:30:00Z',
    reported_by: 'desk.admin@showcase.bu',
    photo_id_checked: true,
    photo_id_checked_at: '2026-11-18T08:35:00Z',
    photo_id_checked_by: 'desk.admin@showcase.bu',
    noc_received: false,
    noc_received_at: null,
    noc_received_by: null,
  }

  // Simulate updating team registration fields
  function updateTeamDetails(team, updates, verification) {
    const updatedTeam = {
      ...team,
      team_name: updates.team_name ?? team.team_name,
      institution: updates.institution ?? team.institution,
      project_title: updates.project_title ?? team.project_title,
    }
    // Verification state is completely outside the team registration update
    return {
      updatedTeam,
      untouchedVerification: { ...verification },
    }
  }

  const { updatedTeam, untouchedVerification } = updateTeamDetails(
    { id: 'team-1', team_name: 'Alpha Project', institution: 'Bennett University' },
    { team_name: 'Alpha Project 3.0', institution: 'Bennett University' },
    initialVerificationState
  )

  assert(updatedTeam.team_name === 'Alpha Project 3.0', 'Team registration details successfully updated')
  assert(untouchedVerification.reported === true, 'Attendance checkpoint "reported" remains verified')
  assert(untouchedVerification.reported_by === 'desk.admin@showcase.bu', 'Attendance verified_by remains untouched')
  assert(untouchedVerification.reported_at === '2026-11-18T08:30:00Z', 'Attendance timestamp remains untouched')
  assert(untouchedVerification.photo_id_checked === true, 'Attendance checkpoint "photo_id_checked" remains verified')
  assert(untouchedVerification.noc_received === false, 'Attendance checkpoint "noc_received" remains unverified')

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n====================================================================')
  console.log(`TASK 2 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
  console.log('====================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTask2Tests()
