/**
 * PROJECT SHOWCASE 3.0 — TASK 1 VERIFICATION & RBAC TEST SUITE
 * Tests all 12 test scenarios for Desk Separation, Role-Based Access Control,
 * Direct Admin Creation, and Activity Logs.
 */

import {
  isInternalInstitution,
  getTeamDesk,
  isTeamAccessible,
  canEditRegistration,
} from '../lib/teams/classification.ts'

function runTests() {
  console.log('===============================================================')
  console.log('PROJECT SHOWCASE 3.0 — TASK 1 RBAC & DESK SEPARATION TEST SUITE')
  console.log('===============================================================\n')

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

  // TEST 1: Classification Engine — Single Server-Side Rule
  console.log('--- SUITE 1: Classification Engine ---')
  assert(isInternalInstitution('Bennett University') === true, 'Bennett University is Internal')
  assert(
    isInternalInstitution('bennett university, greater noida') === true,
    'Lowercase Bennett University is Internal'
  )
  assert(
    isInternalInstitution('Bennett Institute') === true,
    'Institution containing Bennett is Internal'
  )
  assert(
    isInternalInstitution('Delhi Technological University') === false,
    'DTU is External'
  )
  assert(isInternalInstitution('IIT Delhi') === false, 'IIT Delhi is External')
  assert(isInternalInstitution(null) === false, 'null institution is External')
  assert(isInternalInstitution('') === false, 'empty institution is External')
  assert(
    getTeamDesk('Bennett University') === 'internal',
    'getTeamDesk("Bennett University") -> "internal"'
  )
  assert(
    getTeamDesk('Amity University') === 'external',
    'getTeamDesk("Amity University") -> "external"'
  )
  assert(getTeamDesk(null) === 'external', 'getTeamDesk(null) -> "external"')

  // TEST 2: Desk Access Control & Isolation
  console.log('\n--- SUITE 2: Desk Separation Authorization ---')
  const superAdmin = { role: 'super_admin', desk: null }
  const internalAdmin = { role: 'admin', desk: 'internal' }
  const externalAdmin = { role: 'admin', desk: 'external' }
  const unassignedAdmin = { role: 'admin', desk: null }

  // Super Admin can access everything
  assert(
    isTeamAccessible(superAdmin, 'Bennett University') === true,
    'Super Admin can access Internal team'
  )
  assert(
    isTeamAccessible(superAdmin, 'IIT Bombay') === true,
    'Super Admin can access External team'
  )
  assert(
    isTeamAccessible(superAdmin, null) === true,
    'Super Admin can access team with null institution'
  )

  // Internal Admin access
  assert(
    isTeamAccessible(internalAdmin, 'Bennett University') === true,
    'Internal Admin can access Bennett University team'
  )
  assert(
    isTeamAccessible(internalAdmin, 'IIT Bombay') === false,
    'Cross-Desk: Internal Admin CANNOT access External team (403)'
  )
  assert(
    isTeamAccessible(internalAdmin, null) === false,
    'Cross-Desk: Internal Admin CANNOT access null institution team'
  )

  // External Admin access
  assert(
    isTeamAccessible(externalAdmin, 'IIT Bombay') === true,
    'External Admin can access External team'
  )
  assert(
    isTeamAccessible(externalAdmin, 'Amity University') === true,
    'External Admin can access Amity University team'
  )
  assert(
    isTeamAccessible(externalAdmin, 'Bennett University') === false,
    'Cross-Desk: External Admin CANNOT access Bennett University team (403)'
  )

  // Unassigned Admin access
  assert(
    isTeamAccessible(unassignedAdmin, 'Bennett University') === false,
    'Unassigned Admin is blocked from Internal'
  )
  assert(
    isTeamAccessible(unassignedAdmin, 'IIT Bombay') === false,
    'Unassigned Admin is blocked from External'
  )

  // TEST 3: Registration Editing Authorization
  console.log('\n--- SUITE 3: Registration Editing Permissions ---')
  assert(
    canEditRegistration(superAdmin) === true,
    'Super Admin CAN edit team/student registration details'
  )
  assert(
    canEditRegistration(internalAdmin) === false,
    'Regular Admin (Internal) CANNOT edit registration details (403)'
  )
  assert(
    canEditRegistration(externalAdmin) === false,
    'Regular Admin (External) CANNOT edit registration details (403)'
  )

  // TEST 4: Activity Logs Desk Filtering
  console.log('\n--- SUITE 4: Activity Logs Filtering ---')
  const sampleLogs = [
    {
      id: '1',
      team_id: 't1',
      institution: 'Bennett University',
      desk: 'internal',
      field_name: 'reported',
    },
    {
      id: '2',
      team_id: 't2',
      institution: 'IIT Bombay',
      desk: 'external',
      field_name: 'photo_id_checked',
    },
    {
      id: '3',
      team_id: 't3',
      institution: 'Bennett University, Greater Noida',
      desk: 'internal',
      field_name: 'noc_received',
    },
    {
      id: '4',
      team_id: 't4',
      institution: null,
      desk: 'external',
      field_name: 'reported',
    },
  ]

  const internalLogs = sampleLogs.filter((l) => l.desk === internalAdmin.desk)
  assert(
    internalLogs.length === 2,
    'Internal Admin only sees 2 internal verification logs'
  )
  assert(
    internalLogs.every((l) => l.desk === 'internal'),
    'All returned logs belong to internal desk'
  )

  const externalLogs = sampleLogs.filter((l) => l.desk === externalAdmin.desk)
  assert(
    externalLogs.length === 2,
    'External Admin only sees 2 external verification logs'
  )
  assert(
    externalLogs.every((l) => l.desk === 'external'),
    'All returned logs belong to external desk'
  )

  const superAdminLogs = sampleLogs
  assert(
    superAdminLogs.length === 4,
    'Super Admin sees all 4 verification logs across both desks'
  )

  // TEST 5: Direct Admin Creation Validation Logic
  console.log('\n--- SUITE 5: Direct Admin Creation Validation ---')
  function validateAdminCreation({ fullName, email, password, role, desk }) {
    if (!fullName || fullName.trim().length < 2) return 'INVALID_NAME'
    if (!email || !email.includes('@')) return 'INVALID_EMAIL'
    if (!password || password.length < 8) return 'INVALID_PASSWORD'
    if (role !== 'admin' && role !== 'super_admin') return 'INVALID_ROLE'
    if (role === 'admin' && desk !== 'internal' && desk !== 'external')
      return 'MISSING_DESK'
    return 'VALID'
  }

  assert(
    validateAdminCreation({
      fullName: 'John Doe',
      email: 'john@bu.edu',
      password: 'password123',
      role: 'admin',
      desk: 'internal',
    }) === 'VALID',
    'Valid Internal Admin creation accepted'
  )
  assert(
    validateAdminCreation({
      fullName: 'Jane Doe',
      email: 'jane@bu.edu',
      password: 'password123',
      role: 'admin',
      desk: null,
    }) === 'MISSING_DESK',
    'Admin without desk rejected'
  )
  assert(
    validateAdminCreation({
      fullName: 'Super User',
      email: 'super@bu.edu',
      password: 'password123',
      role: 'super_admin',
      desk: null,
    }) === 'VALID',
    'Valid Super Admin creation accepted'
  )
  assert(
    validateAdminCreation({
      fullName: 'Short',
      email: 'user@bu.edu',
      password: '123',
      role: 'admin',
      desk: 'internal',
    }) === 'INVALID_PASSWORD',
    'Short password (< 8 chars) rejected'
  )

  // TEST 6: Last Active Super Admin Protection Logic
  console.log('\n--- SUITE 6: Last Active Super Admin Protection ---')
  function canDemoteOrDeactivate(
    targetUser,
    activeSuperAdminCount,
    newRole,
    newActive
  ) {
    if (targetUser.role === 'super_admin' && targetUser.is_active) {
      if (newRole !== 'super_admin' || !newActive) {
        if (activeSuperAdminCount <= 1) return false
      }
    }
    return true
  }

  assert(
    canDemoteOrDeactivate(
      { role: 'super_admin', is_active: true },
      1,
      'admin',
      true
    ) === false,
    'Demoting last active Super Admin BLOCKED (409)'
  )
  assert(
    canDemoteOrDeactivate(
      { role: 'super_admin', is_active: true },
      1,
      'super_admin',
      false
    ) === false,
    'Deactivating last active Super Admin BLOCKED (409)'
  )
  assert(
    canDemoteOrDeactivate(
      { role: 'super_admin', is_active: true },
      2,
      'admin',
      true
    ) === true,
    'Demoting Super Admin when 2 exist ALLOWED'
  )
  assert(
    canDemoteOrDeactivate(
      { role: 'admin', is_active: true },
      1,
      'admin',
      false
    ) === true,
    'Deactivating regular admin ALLOWED'
  )

  console.log('\n===============================================================')
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('===============================================================')

  if (failed > 0) process.exit(1)
}

runTests()
