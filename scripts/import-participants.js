
const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const FILE_PATH =
  'D:/Web development/Project_Showcase_3.0_Participant_List (7).xlsx'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

const serviceKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  throw new Error('Supabase URL or service role/secret key is missing from .env.local')
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const clean = (value) => {
  if (value === undefined || value === null) return null
  const result = String(value).trim()
  return result === '' ? null : result
}

async function main() {
  console.log('Reading Excel workbook...')

  const workbook = XLSX.readFile(FILE_PATH)

  const teamRows = XLSX.utils.sheet_to_json(
    workbook.Sheets['Team List'],
    { defval: '' }
  )

  const studentRows = XLSX.utils.sheet_to_json(
    workbook.Sheets['Student List'],
    { defval: '' }
  )

  if (teamRows.length !== 130 || studentRows.length !== 434) {
    throw new Error(
      `Unexpected row counts: ${teamRows.length} teams, ${studentRows.length} students. Import stopped.`
    )
  }

  const teams = teamRows.map((row) => ({
    source_team_id: clean(row['Team ID']),
    team_name: clean(row['Team Name']),
    institution: clean(row['Institute']),
    project_title: clean(row['Project Title']),
    project_domain: clean(row['Project Domain']),
    faculty_mentor: clean(row['Faculty / Mentor']),
    team_size: row['Team Size'] === '' ? null : Number(row['Team Size']),
    leader_name: clean(row['Team Leader']),
    leader_enrollment_no: clean(row['Leader Enrollment No.']),
    leader_mobile: clean(row['Leader Mobile']),
    leader_email: clean(row['Leader Email']),
  }))

  const invalidTeam = teams.find(
    (team) =>
      !team.source_team_id ||
      (team.team_size !== null && !Number.isFinite(team.team_size))
  )

  if (invalidTeam) {
    throw new Error('Invalid team data found. Import stopped.')
  }

  const { data: existingTeams, error: existingError } = await supabase
    .from('teams')
    .select('id')
    .limit(1)

  if (existingError) throw existingError

  const { data: existingStudents, error: studentCheckError } = await supabase
    .from('students')
    .select('id')
    .limit(1)

  if (studentCheckError) throw studentCheckError

  if (existingTeams.length || existingStudents.length) {
    throw new Error(
      'Database is no longer empty. Import stopped to prevent accidental duplicates.'
    )
  }

  console.log('Importing teams...')

  const { data: insertedTeams, error: teamError } = await supabase
    .from('teams')
    .insert(teams)
    .select('id, source_team_id')

  if (teamError) throw teamError

  const teamIdMap = new Map(
    insertedTeams.map((team) => [team.source_team_id, team.id])
  )

  const students = studentRows.map((row) => {
    const sourceTeamId = clean(row['Team ID'])
    const teamId = teamIdMap.get(sourceTeamId)

    if (!teamId) {
      throw new Error(`Student references an unknown Team ID: ${sourceTeamId}`)
    }

    return {
      team_id: teamId,
      name: clean(row['Student Name']),
      enrollment_no: clean(row['Enrollment No.']),
      mobile: clean(row['Mobile']),
      email: clean(row['Email']),
      role: clean(row['Role']),
    }
  })

  if (students.some((student) => !student.name)) {
    throw new Error('A student record has no name. Import stopped.')
  }

  console.log('Importing students...')

  const batchSize = 100

  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize)

    const { error } = await supabase
      .from('students')
      .insert(batch)

    if (error) throw error

    console.log(
      `Imported students ${i + 1}–${i + batch.length} of ${students.length}`
    )
  }

  const { count: finalTeams, error: finalTeamError } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })

  if (finalTeamError) throw finalTeamError

  const { count: finalStudents, error: finalStudentError } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })

  if (finalStudentError) throw finalStudentError

  console.log('\nImport completed.')
  console.log('Teams:', finalTeams)
  console.log('Students:', finalStudents)
}

main().catch((error) => {
  console.error('\nIMPORT FAILED:', error.message || error)
  process.exitCode = 1
})
