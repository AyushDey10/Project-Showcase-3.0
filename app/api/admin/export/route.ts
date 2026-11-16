import JSZip from 'jszip'
import * as XLSX from 'xlsx-js-style'
import { getAdminUser } from '@/lib/auth/admin'
import { readTeamSource, type TeamRecord } from '@/lib/attendance/source'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const headers = [
  'Serial Number',
  'Team ID',
  'Team Name',
  'Team Leader Name',
  'Registered Gmail ID',
  'Team Category',
  'Team Member Names',
  'Total Team Members',
  'Attendance Status',
  'Check-in Date',
  'Check-in Time',
]

function toWorksheet(teams: TeamRecord[]) {
  const rows = teams.map((team, index) => {
    const [checkInDate = '', checkInTime = ''] = team.checkedInAt?.split('T') ?? []
    return [
      index + 1,
      team.teamId,
      team.teamName,
      team.leaderName,
      team.leaderEmail,
      team.categoryValue,
      team.memberNames.join(', '),
      team.totalMembers ?? '',
      team.status,
      checkInDate,
      checkInTime,
    ]
  })
  const styledHeaders = headers.map((value) => ({
    v: value,
    t: 's' as const,
    s: {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '111116' } },
      alignment: { vertical: 'center', wrapText: true },
    },
  }))
  const sheet = XLSX.utils.aoa_to_sheet([styledHeaders, ...rows])
  sheet['!rows'] = [{ hpt: 30 }]
  sheet['!cols'] = [
    { wch: 14 }, { wch: 26 }, { wch: 30 }, { wch: 24 }, { wch: 32 }, { wch: 16 },
    { wch: 42 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 },
  ]
  sheet['!autofilter'] = { ref: `A1:K${Math.max(rows.length + 1, 1)}` }
  return sheet
}

async function freezeHeaderRows(buffer: Buffer) {
  const archive = await JSZip.loadAsync(buffer)
  const worksheetPaths = Object.keys(archive.files).filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path))
  for (const path of worksheetPaths) {
    const file = archive.file(path)
    if (!file) continue
    let xml = await file.async('string')
    const views = '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>'
    if (xml.includes('<sheetViews>')) xml = xml.replace(/<sheetViews>[\s\S]*?<\/sheetViews>/, views)
    else if (/<(?:sheetFormatPr|cols|sheetData)\b/.test(xml)) xml = xml.replace(/(<(?:sheetFormatPr|cols|sheetData)\b)/, `${views}$1`)
    else xml = xml.replace(/(<worksheet\b[^>]*>)/, `$1${views}`)
    archive.file(path, xml)
  }
  return archive.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return jsonError('Admin authorization required.', 401)

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope') ?? 'all'
  const allowedScopes = new Set(['all', 'internal', 'external', 'present', 'absent', 'filtered'])
  if (!allowedScopes.has(scope)) return jsonError('Invalid export selection.', 400)

  const source = await readTeamSource()
  if (source.issue || !source.configured) return jsonError('The registered team data source is not ready for export.', 503)

  const query = (searchParams.get('q') ?? '').trim().toLowerCase()
  const categoryFilter = searchParams.get('category')
  const statusFilter = searchParams.get('status')?.toUpperCase()
  const filter = (teams: TeamRecord[]) => teams.filter((team) => {
    if (categoryFilter && team.category !== categoryFilter) return false
    if (statusFilter && team.status !== statusFilter) return false
    if (query && ![team.teamName, team.leaderName, team.leaderEmail, team.teamId].some((value) => value.toLowerCase().includes(query))) return false
    return true
  })

  const allTeams = filter(source.teams)
  const presentTeams = allTeams.filter((team) => team.status === 'PRESENT')
  const absentTeams = allTeams.filter((team) => team.status === 'ABSENT')
  const internalTeams = allTeams.filter((team) => team.category === 'internal')
  const externalTeams = allTeams.filter((team) => team.category === 'external')
  const workbook = XLSX.utils.book_new()
  let filename = 'Project_Showcase_Attendance_2026.xlsx'

  if (scope === 'all') {
    XLSX.utils.book_append_sheet(workbook, toWorksheet(allTeams), 'All Teams')
    XLSX.utils.book_append_sheet(workbook, toWorksheet(internalTeams), 'Internal Teams')
    XLSX.utils.book_append_sheet(workbook, toWorksheet(externalTeams), 'External Teams')
    XLSX.utils.book_append_sheet(workbook, toWorksheet(presentTeams), 'Present Teams')
    XLSX.utils.book_append_sheet(workbook, toWorksheet(absentTeams), 'Absent Teams')
    filename = 'Project_Showcase_Attendance_2026.xlsx'
  } else {
    const tabs: Record<string, { teams: TeamRecord[]; sheet: string; filename: string }> = {
      internal: { teams: internalTeams, sheet: 'Internal Teams', filename: 'Project_Showcase_Internal_Teams_2026.xlsx' },
      external: { teams: externalTeams, sheet: 'External Teams', filename: 'Project_Showcase_External_Teams_2026.xlsx' },
      present: { teams: presentTeams, sheet: 'Present Teams', filename: 'Project_Showcase_Present_Teams_2026.xlsx' },
      absent: { teams: absentTeams, sheet: 'Absent Teams', filename: 'Project_Showcase_Absent_Teams_2026.xlsx' },
      filtered: { teams: allTeams, sheet: 'Filtered Results', filename: 'Project_Showcase_Filtered_Attendance_2026.xlsx' },
    }
    const selected = tabs[scope]
    XLSX.utils.book_append_sheet(workbook, toWorksheet(selected.teams), selected.sheet)
    filename = selected.filename
  }

  const workbookBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const buffer = await freezeHeaderRows(workbookBuffer)
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
