'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (authError || !data.user) {
      const code = authError?.code ?? ''
      setError(code === 'email_not_confirmed' ? 'Confirm your email before signing in.' : authError?.status === 429 ? 'Too many sign-in attempts. Please wait and try again.' : authError?.code === 'invalid_credentials' || authError?.message.toLowerCase().includes('invalid login') ? 'Invalid email or password.' : 'We could not complete sign-in. Please try again.')
      setBusy(false)
      return
    }
    const { data: profile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('role, is_active')
      .eq('id', data.user.id)
      .maybeSingle()

    if (
      profileError ||
      !profile ||
      !profile.is_active ||
      !['admin', 'super_admin'].includes(profile.role)
    ) {
      await supabase.auth.signOut()
      setError('This account is not authorized for admin access.')
      setBusy(false)
      return
    }
    router.replace('/admin')
    router.refresh()
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#f7f7f4] px-4 py-16 text-[#111116] sm:py-20">
      <div className="absolute right-4 top-4 sm:right-8 sm:top-8"><ThemeToggle /></div>
      <div className="grid w-full max-w-[940px] overflow-hidden rounded-[26px] border border-[#e7e6df] bg-white shadow-[0_28px_80px_-45px_rgba(24,24,32,.35)] md:grid-cols-[.9fr_1.1fr]">
        <section className="relative flex min-h-[240px] flex-col justify-between overflow-hidden bg-[#111116] p-7 text-white sm:p-9 md:min-h-[560px]">
          <div className="absolute -right-24 -top-16 size-64 rounded-full border-[42px] border-[#c6f135]" aria-hidden="true" />
          <Link href="/" className="relative inline-flex w-fit items-center gap-2 text-xs font-semibold text-white/65 hover:text-white"><ArrowLeft size={14} aria-hidden="true" /> Public portal</Link>
          <div className="relative mt-14 md:mt-0">
            <span className="relative grid size-12 place-items-center overflow-hidden rounded-2xl border border-white/20 bg-[#ffffff] p-1.5 shadow-sm">
              <Image
                src="/student-cabinet-logo.png"
                alt="Student Cabinet logo"
                width={48}
                height={48}
                priority
                className="size-full object-contain"
              />
            </span>
            <p className="mt-7 text-[10px] font-black uppercase tracking-[.2em] text-[#c6f135]">Student Cabinet</p>
            <h1 className="mt-3 max-w-sm text-4xl font-black leading-[.95] tracking-[-.07em] sm:text-[2.5rem]">The showcase,<br />behind the scenes.</h1>
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/60">Secure attendance operations for Project Showcase 2026.</p>
          </div>
          <p className="relative mt-10 text-[10px] text-white/35">Bennett University · 2026</p>
        </section>

        <section className="flex flex-col justify-center p-6 sm:p-10 md:p-12">
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#7c3aed]">Admin workspace</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Welcome back.</h2>
            <p className="mt-2 text-sm text-[#71717a]">Sign in with your authorized administrator account.</p>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="admin-email" className="mb-2 block text-xs font-bold">Email address</label>
              <div className="flex h-12 items-center gap-3 rounded-xl border border-[#e0e0da] bg-[#fbfbf9] px-4 focus-within:border-[#7c3aed] focus-within:ring-4 focus-within:ring-[#7c3aed]/10">
                <Mail size={16} className="text-[#8b8b91]" aria-hidden="true" />
                <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </div>
            </div>
            <div>
              <label htmlFor="admin-password" className="mb-2 block text-xs font-bold">Password</label>
              <div className="flex h-12 items-center gap-3 rounded-xl border border-[#e0e0da] bg-[#fbfbf9] px-4 focus-within:border-[#7c3aed] focus-within:ring-4 focus-within:ring-[#7c3aed]/10">
                <LockKeyhole size={16} className="text-[#8b8b91]" aria-hidden="true" />
                <input id="admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none" />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="grid size-8 place-items-center text-[#777780] hover:text-[#111116]">{showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button>
              </div>
            </div>
            {error && <p className="rounded-xl bg-[#fff2f0] px-4 py-3 text-xs leading-5 text-[#a33b30]" role="alert">{error}</p>}
            <Button type="submit" disabled={busy} className="h-12 rounded-xl bg-[#111116] text-xs font-black tracking-[.12em] text-white hover:bg-[#34343b]">
              {busy ? 'SIGNING IN…' : <>SIGN IN <ArrowRight data-icon="inline-end" aria-hidden="true" /></>}
            </Button>
          </form>
          <p className="mt-7 border-t border-[#eeeeea] pt-5 text-[11px] leading-5 text-[#85858d]">
            Admin access is restricted to active accounts authorized by the Student Cabinet.
          </p>
        </section>
      </div>
    </main>
  )
}
