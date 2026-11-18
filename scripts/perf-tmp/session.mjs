// TEMPORARY perf-measurement helper — deleted after measuring.
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t.startsWith('#') || !t.includes('=')) continue
  const i = t.indexOf('=')
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}

const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
const secret = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
const anon = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const email = process.argv[2] ?? 'ayushdey1007@gmail.com'
const label = process.argv[3] ?? 'superadmin'

const admin = createClient(url, secret, { auth: { persistSession: false } })
const link = await admin.auth.admin.generateLink({ type: 'magiclink', email })
if (link.error) throw new Error(link.error.message)
const plain = createClient(url, anon, { auth: { persistSession: false } })
const otp = await plain.auth.verifyOtp({
  type: 'magiclink',
  token_hash: link.data.properties.hashed_token,
})
if (otp.error || !otp.data.session) throw new Error(otp.error?.message ?? 'no session')

const jar = []
const ssr = createServerClient(url, anon, {
  cookieOptions: { secure: false },
  cookies: {
    getAll: () => jar,
    setAll: (list) => {
      for (const c of list) {
        const i = jar.findIndex((j) => j.name === c.name)
        if (i >= 0) jar[i] = c
        else jar.push(c)
      }
    },
  },
})
const set = await ssr.auth.setSession({
  access_token: otp.data.session.access_token,
  refresh_token: otp.data.session.refresh_token,
})
if (set.error) throw new Error(set.error.message)

fs.mkdirSync(path.join('scripts', 'perf-tmp'), { recursive: true })
fs.writeFileSync(path.join('scripts', 'perf-tmp', `${label}.json`), JSON.stringify(jar, null, 2))
console.log(JSON.stringify({ ok: true, email, cookies: jar.map((c) => c.name) }))
