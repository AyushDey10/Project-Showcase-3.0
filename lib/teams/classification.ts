/**
 * Centralized team classification & desk authorization helpers.
 *
 * Single Source of Truth Rule:
 * - Any team whose institution contains "Bennett" (case-insensitive) belongs to the "internal" desk.
 * - All other institutions (or null/empty) belong to the "external" desk.
 */

export type DeskType = 'internal' | 'external'

/**
 * Returns true if the institution is Bennett University (internal).
 */
export function isInternalInstitution(institution: string | null | undefined): boolean {
  if (!institution) return false
  return institution.toLowerCase().includes('bennett')
}

/**
 * Returns the desk type ('internal' | 'external') for a given institution.
 */
export function getTeamDesk(institution: string | null | undefined): DeskType {
  return isInternalInstitution(institution) ? 'internal' : 'external'
}

/**
 * Returns a human-readable desk label.
 */
export function getDeskLabel(desk: DeskType | null | undefined): string {
  if (!desk) return 'All Desks'
  return desk === 'internal' ? 'Internal Desk (Bennett)' : 'External Desk (Other Institutions)'
}

/**
 * Checks if an administrator is authorized to access, view, or verify a team.
 *
 * Super Admins can access all teams across both desks.
 * Regular Admins can ONLY access teams matching their assigned desk.
 */
export function isTeamAccessible(
  admin: { role: string; desk?: string | null; is_active?: boolean } | null | undefined,
  teamInstitution: string | null | undefined
): boolean {
  if (!admin || admin.is_active === false) {
    return false
  }

  if (admin.role === 'super_admin') {
    return true
  }

  if (admin.role === 'admin') {
    if (!admin.desk) return false
    const teamDesk = getTeamDesk(teamInstitution)
    return admin.desk === teamDesk
  }

  return false
}

/**
 * Checks if an administrator can edit team/student registration details.
 * ONLY active Super Admins have permission to edit registration information.
 */
export function canEditRegistration(
  admin: { role: string; is_active?: boolean } | null | undefined
): boolean {
  if (!admin || admin.is_active === false) {
    return false
  }
  return admin.role === 'super_admin'
}
