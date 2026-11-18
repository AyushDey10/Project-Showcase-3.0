/**
 * Reporting location (panel / block / table) helpers.
 *
 * The three values live on public.teams and come from the registration sheet.
 * Super Admins can correct them. Validation lives here so the edit form and the
 * server route enforce exactly the same rules.
 */

export interface ReportingLocation {
  panel_number: number | null
  reporting_block: string | null
  table_number: number | null
}

export type ReportingLocationField = 'panel_number' | 'reporting_block' | 'table_number'

export interface ReportingLocationValidation {
  ok: boolean
  errors: Partial<Record<ReportingLocationField, string>>
  value: ReportingLocation | null
}

export interface TeamReportingLocationResponse {
  location: ReportingLocation
  team: {
    id: string
    source_team_id: string | null
    team_name: string | null
  }
}

export const PANEL_NUMBER_MIN = 1
export const PANEL_NUMBER_MAX = 99
export const TABLE_NUMBER_MIN = 1
export const TABLE_NUMBER_MAX = 999

export function hasCompleteReportingLocation(
  location: ReportingLocation | null | undefined
): boolean {
  if (!location) return false

  return (
    Number.isInteger(location.panel_number) &&
    Number.isInteger(location.table_number) &&
    Boolean(location.reporting_block && location.reporting_block.trim())
  )
}

/** "Block A · Table 12" — the exact phrasing used in the volunteer popup. */
export function formatReportingLocation(
  location: ReportingLocation | null | undefined
): string | null {
  if (!hasCompleteReportingLocation(location)) return null

  return `Block ${location!.reporting_block} · Table ${location!.table_number}`
}

function parseInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim())
  return null
}

export function validateReportingLocation(input: {
  panel_number: unknown
  reporting_block: unknown
  table_number: unknown
}): ReportingLocationValidation {
  const errors: Partial<Record<ReportingLocationField, string>> = {}

  const panel = parseInteger(input.panel_number)
  const table = parseInteger(input.table_number)
  const block =
    typeof input.reporting_block === 'string'
      ? input.reporting_block.trim().toUpperCase()
      : ''

  if (panel === null) {
    errors.panel_number = 'Panel number must be a whole number.'
  } else if (panel < PANEL_NUMBER_MIN || panel > PANEL_NUMBER_MAX) {
    errors.panel_number = `Panel number must be between ${PANEL_NUMBER_MIN} and ${PANEL_NUMBER_MAX}.`
  }

  if (!block) {
    errors.reporting_block = 'Reporting block is required.'
  } else if (!/^[A-Z]$/.test(block)) {
    errors.reporting_block = 'Reporting block must be a single letter (A–Z).'
  }

  if (table === null) {
    errors.table_number = 'Table number must be a whole number.'
  } else if (table < TABLE_NUMBER_MIN || table > TABLE_NUMBER_MAX) {
    errors.table_number = `Table number must be between ${TABLE_NUMBER_MIN} and ${TABLE_NUMBER_MAX}.`
  }

  const ok = Object.keys(errors).length === 0

  return {
    ok,
    errors,
    value: ok
      ? { panel_number: panel, reporting_block: block, table_number: table }
      : null,
  }
}

function describeValue(value: number | string | null): string {
  if (value === null || value === undefined || value === '') return 'Not assigned'
  return String(value)
}

/**
 * Human-readable audit summary, e.g. "Panel 1 → 2 · Block A → B · Table 5 → 9".
 * Used as the audit reason so the change is readable in the existing
 * activity log even before structured details are inspected.
 */
export function describeReportingLocationChange(
  previous: ReportingLocation,
  next: ReportingLocation
): string {
  const changes: string[] = []

  if (previous.panel_number !== next.panel_number) {
    changes.push(
      `Panel ${describeValue(previous.panel_number)} → ${describeValue(next.panel_number)}`
    )
  }

  if ((previous.reporting_block ?? '') !== (next.reporting_block ?? '')) {
    changes.push(
      `Block ${describeValue(previous.reporting_block)} → ${describeValue(next.reporting_block)}`
    )
  }

  if (previous.table_number !== next.table_number) {
    changes.push(
      `Table ${describeValue(previous.table_number)} → ${describeValue(next.table_number)}`
    )
  }

  return changes.length > 0 ? changes.join(' · ') : 'Reporting location updated'
}

/**
 * Reads the latest reporting location from Supabase (through the admin API,
 * which enforces the caller's desk access). Used after a Reported checkpoint
 * succeeds so the popup never shows stale or unverified values.
 */
export async function fetchTeamReportingLocation(
  teamId: string
): Promise<TeamReportingLocationResponse> {
  const res = await fetch(`/api/admin/teams/${teamId}/reporting-location`, {
    cache: 'no-store',
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(
      typeof data?.error === 'string'
        ? data.error
        : 'Could not load the reporting location.'
    )
  }

  return data as TeamReportingLocationResponse
}
