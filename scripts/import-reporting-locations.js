/**
 * Imports reporting locations (panel / block / table) from the evaluation
 * registration sheet into existing teams.
 *
 * Usage:
 *   node scripts/import-reporting-locations.js --dry-run   # validate matching only
 *   node scripts/import-reporting-locations.js             # apply + verify
 *
 * Rules:
 * - Teams are matched only by the exact source Team ID.
 * - Only panel_number, reporting_block and table_number are written.
 * - No teams are created; unmatched IDs are reported and skipped.
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const DATA_FILE = path.join(__dirname, 'data', 'reporting-locations.json')

const BASELINE_COLUMNS = [
  'team_name',
  'project_title',
  'institution',
  'project_domain',
  'faculty_mentor',
  'team_size',
  'leader_name',
  'leader_enrollment_no',
  'leader_mobile',
  'leader_email',
]

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error('Supabase URL or service role/secret key is missing from .env.local')
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const dryRun = process.argv.includes('--dry-run')

const sameValue = (a, b) => {
  if (a === undefined || a === null) return b === undefined || b === null
  return String(a) === String(b)
}

async function loadTeams(columns) {
  const { data, error } = await supabase.from('teams').select(columns)
  if (error) throw error
  return data
}

async function main() {
  const expected = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  console.log(`Sheet records: ${expected.length}`)

  const ids = new Set(expected.map((row) => row.source_team_id))
  if (ids.size !== expected.length) {
    throw new Error('Duplicate Team IDs in the prepared dataset. Import stopped.')
  }

  const teams = await loadTeams(['id', 'source_team_id', ...BASELINE_COLUMNS].join(', '))
  console.log(`Existing teams in database: ${teams.length}`)

  const teamsBySourceId = new Map(teams.map((team) => [team.source_team_id, team]))

  const matched = expected.filter((row) => teamsBySourceId.has(row.source_team_id))
  const unmatched = expected.filter((row) => !teamsBySourceId.has(row.source_team_id))
  const sheetIds = new Set(expected.map((row) => row.source_team_id))
  const teamsWithoutSheetRow = teams.filter((team) => !sheetIds.has(team.source_team_id))

  console.log(`Matched Team IDs: ${matched.length}`)
  console.log(`Unmatched Team IDs: ${unmatched.length}`)
  if (unmatched.length) {
    console.log(unmatched.map((row) => `  - ${row.source_team_id}`).join('\n'))
  }
  if (teamsWithoutSheetRow.length) {
    console.log(`Teams missing from the sheet: ${teamsWithoutSheetRow.length}`)
    console.log(teamsWithoutSheetRow.map((team) => `  - ${team.source_team_id}`).join('\n'))
  }

  if (dryRun) {
    console.log('\nDry run complete. No rows were written.')
    return
  }

  let updated = 0
  const failures = []

  for (const row of matched) {
    const team = teamsBySourceId.get(row.source_team_id)

    const { data, error } = await supabase
      .from('teams')
      .update({
        panel_number: row.panel_number,
        reporting_block: row.reporting_block,
        table_number: row.table_number,
      })
      .eq('id', team.id)
      .select('id')

    if (error) {
      failures.push({ team_id: row.source_team_id, reason: error.message })
      continue
    }

    if (!data || data.length !== 1) {
      failures.push({ team_id: row.source_team_id, reason: 'No row updated' })
      continue
    }

    updated += 1
  }

  console.log(`\nUpdated: ${updated}`)
  if (failures.length) {
    console.log(`Failed updates: ${failures.length}`)
    console.log(failures.map((f) => `  - ${f.team_id}: ${f.reason}`).join('\n'))
  }

  // ---- Verification -------------------------------------------------------
  const after = await loadTeams(
    ['id', 'source_team_id', 'panel_number', 'reporting_block', 'table_number', ...BASELINE_COLUMNS].join(', ')
  )

  console.log(`\nVerification`)
  console.log(`  Team rows: ${teams.length} before, ${after.length} after`)

  const afterBySourceId = new Map(after.map((team) => [team.source_team_id, team]))

  let locationMismatches = 0
  let baselineChanges = 0

  for (const row of matched) {
    const team = afterBySourceId.get(row.source_team_id)
    if (
      !team ||
      team.panel_number !== row.panel_number ||
      team.reporting_block !== row.reporting_block ||
      team.table_number !== row.table_number
    ) {
      locationMismatches += 1
      console.log(`  location mismatch: ${row.source_team_id}`)
    }

    const before = teamsBySourceId.get(row.source_team_id)
    for (const column of BASELINE_COLUMNS) {
      if (!sameValue(before[column], team && team[column])) {
        baselineChanges += 1
        console.log(`  baseline field changed: ${row.source_team_id}.${column}`)
        break
      }
    }
  }

  // Every team should appear once; a duplicate source ID would mean a duplicate row.
  const duplicateSourceIds = after
    .map((team) => team.source_team_id)
    .filter((id, index, all) => all.indexOf(id) !== index)

  console.log(`  Location mismatches: ${locationMismatches}`)
  console.log(`  Baseline field changes: ${baselineChanges}`)
  console.log(`  Duplicate teams: ${duplicateSourceIds.length}`)
  console.log(`  Unmatched Team IDs: ${unmatched.length}`)

  const ok =
    updated === matched.length &&
    failures.length === 0 &&
    locationMismatches === 0 &&
    baselineChanges === 0 &&
    duplicateSourceIds.length === 0 &&
    after.length === teams.length

  console.log(`\nImport ${ok ? 'SUCCESSFUL' : 'INCOMPLETE'}`)
  if (!ok) process.exitCode = 1
}

main().catch((error) => {
  const message = error.message || String(error)
  if (/column .* does not exist|Could not find the '(panel_number|reporting_block|table_number)'/i.test(message)) {
    console.error(
      '\nIMPORT BLOCKED: reporting-location columns are missing.\n' +
        'Run supabase/migrations/20261119_team_reporting_locations.sql in the Supabase SQL Editor, then retry.'
    )
  } else {
    console.error('\nIMPORT FAILED:', message)
  }
  process.exitCode = 1
})
