// TEMPORARY perf-measurement helper — deleted after measuring.
import fs from 'node:fs'
import path from 'node:path'

const base = process.env.PERF_BASE ?? 'http://localhost:3200'
const label = process.argv[2] ?? 'superadmin'
const jar = JSON.parse(fs.readFileSync(path.join('scripts', 'perf-tmp', `${label}.json`), 'utf8'))
const cookie = jar.map((c) => `${c.name}=${c.value}`).join('; ')

const TEAM = '6cd2485b-038b-45c8-9392-006a56d17173'

async function time(name, url, runs = 3) {
  const times = []
  let status = 0
  let bytes = 0
  for (let i = 0; i < runs; i++) {
    const started = performance.now()
    const res = await fetch(base + url, { headers: { cookie }, redirect: 'manual' })
    const body = await res.text()
    times.push(performance.now() - started)
    status = res.status
    bytes = Buffer.byteLength(body)
  }
  times.sort((a, b) => a - b)
  return {
    name,
    status,
    medianMs: Math.round(times[Math.floor(times.length / 2)]),
    minMs: Math.round(times[0]),
    kb: Math.round(bytes / 1024),
  }
}

const results = []
results.push(await time('dashboard (server HTML)', '/admin'))
results.push(await time('teams page (HTML shell)', '/admin/teams'))
results.push(await time('team detail (HTML shell)', `/admin/teams/${TEAM}`))
results.push(await time('api teams page 1', '/api/admin/teams?page=1&pageSize=25'))
results.push(await time('api activity', '/api/admin/activity'))
results.push(await time('api team detail', `/api/admin/teams/${TEAM}`))
results.push(await time('api users', '/api/admin/users'))
results.push(await time('api sheets status', '/api/admin/sheets/status'))

console.log(JSON.stringify(results, null, 2))
