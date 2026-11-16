'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, CircleAlert, Clock3, LoaderCircle, Mail, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

type Category = 'internal' | 'external'
type VerificationResult = {
  leaderName: string
  maskedEmail: string
  category: Category
  checkedInAt: string
}

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address.').refine((email) => email.toLowerCase().endsWith('@gmail.com'), 'Use the registered Gmail address for this team.'),
})
type FormValues = z.infer<typeof schema>

const copy = {
  internal: {
    eyebrow: 'Bennett University · Internal team check-in',
    category: 'INTERNAL',
    detail: 'This route is exclusively for registered Bennett University teams.',
    tint: 'bg-[#c6f135]',
  },
  external: {
    eyebrow: 'External participants · Team check-in',
    category: 'EXTERNAL',
    detail: 'This route is exclusively for teams registered from other institutions.',
    tint: 'bg-[#dcd1ff]',
  },
} satisfies Record<Category, { eyebrow: string; category: string; detail: string; tint: string }>

export function AttendancePortal({ category }: { category: Category }) {
  const details = copy[category]
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setNotice(null)
    setResult(null)
    try {
      const response = await fetch(`/api/attendance/${category}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email.trim().toLowerCase() }),
      })
      const body = await response.json() as { error?: string; status?: string; team?: VerificationResult }
      if (response.ok && body.team) {
        setResult(body.team)
        setNotice({ kind: 'success', text: 'Attendance successfully marked!' })
      } else {
        setNotice({ kind: 'error', text: body.error ?? 'Attendance verification is temporarily unavailable. Please contact an event coordinator.' })
      }
    } catch {
      setNotice({ kind: 'error', text: 'We couldn’t reach the attendance service. Please try again or contact an event coordinator.' })
    }
  }

  function guardImeEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault()
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] px-4 py-5 text-[#111116] sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-3">
        <Link href="/" className="inline-flex min-w-0 items-center gap-2 text-xs font-bold text-[#66666e] transition hover:text-[#111116]"><ArrowLeft size={15} aria-hidden="true" /> Project Showcase</Link>
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e3e3dc] bg-[#ffffff] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-[#111116] shadow-sm dark:border-white/15 dark:bg-[#ffffff] dark:!text-[#000000]">
            <span className="relative size-4 shrink-0 overflow-hidden rounded-full">
              <Image
                src="/student-cabinet-logo.png"
                alt="Student Cabinet logo"
                width={16}
                height={16}
                className="size-full object-contain"
              />
            </span>
            <span className="attendance-cabinet-text dark:!text-[#000000]">2026 · Student Cabinet</span>
          </span>
          <ThemeToggle />
        </div>
      </div>

      <section className="mx-auto grid min-h-[calc(100svh-104px)] w-full max-w-[1180px] items-center gap-8 py-10 lg:grid-cols-[.82fr_1.18fr] lg:gap-14">
        <div className="order-2 lg:order-1">
          <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-[#e5e4dc] bg-white px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-[#5f5f67]">
            <span className={`size-2 rounded-full ${details.tint}`} /> {details.eyebrow}
          </div>
          <h1 className="max-w-[640px] text-[clamp(2.2rem,4.6vw,5.4rem)] font-black leading-[.88] tracking-[-.08em]">YOUR PROJECT.<br />YOUR TEAM.<br /><span className="relative inline-block">YOUR PRESENCE.<span className={`absolute bottom-[.05em] left-0 -z-0 h-[.17em] w-full ${details.tint}`} /></span></h1>
          <p className="mt-7 max-w-md text-base leading-7 text-[#66666e] sm:text-lg">Welcome to Project Showcase. Verify your team&apos;s attendance in seconds.</p>
          <div className="mt-8 flex items-start gap-3 border-t border-[#e5e4dc] pt-5">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#7c3aed]" size={18} aria-hidden="true" />
            <p className="max-w-sm text-xs leading-5 text-[#6f6f77]">Only the registered team leader Gmail ID is needed. One check-in marks the entire team present.</p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="order-1 overflow-hidden rounded-[26px] border border-[#e6e5de] bg-white shadow-[0_28px_80px_-45px_rgba(24,24,32,.35)] lg:order-2">
          <div className="flex items-center justify-between border-b border-[#efefea] px-5 py-5 sm:px-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#8b8b91]">Project Showcase 2026</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.04em] sm:text-2xl">Team check-in</h2>
            </div>
            <span className={`rounded-lg px-3 py-2 text-[10px] font-black tracking-[.14em] ${details.tint}`}>{details.category}</span>
          </div>

          <div className="p-5 sm:p-8">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div key="success" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} role="status" aria-live="polite">
                  <div className="grid size-14 place-items-center rounded-2xl bg-[#c6f135]"><Check size={28} strokeWidth={3} aria-hidden="true" /></div>
                  <p className="mt-6 text-[10px] font-black uppercase tracking-[.18em] text-[#5c632f]">Confirmed</p>
                  <h3 className="mt-2 text-2xl font-black leading-tight tracking-[-.05em] sm:text-3xl">ATTENDANCE<br className="sm:hidden" /> SUCCESSFULLY MARKED!</h3>
                  <p className="mt-3 text-sm leading-6 text-[#686871]">Your entire team has been marked present for Project Showcase.</p>
                  <dl className="mt-6 grid gap-0 divide-y divide-[#e9e9e3] rounded-2xl border border-[#e9e9e3] px-4 sm:px-5">
                    <Detail label="Team leader" value={result.leaderName} />
                    <Detail label="Registered email" value={result.maskedEmail} />
                    <Detail label="Category" value={result.category.toUpperCase()} />
                    <Detail label="Attendance status" value="PRESENT" />
                    <div className="flex items-center justify-between gap-4 py-3"><dt className="inline-flex items-center gap-2 text-xs text-[#777780]"><Clock3 size={14} aria-hidden="true" /> Check-in time</dt><dd className="text-right text-xs font-semibold">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(result.checkedInAt))}</dd></div>
                  </dl>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-sm leading-6 text-[#686871]">Enter the email address used by your registered team leader. No other details are required.</p>
                  <form className="mt-7 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div>
                      <label htmlFor="leader-email" className="mb-2 block text-xs font-bold">Registered Team Leader Gmail ID</label>
                      <div className={`flex h-14 items-center gap-3 rounded-xl border bg-[#fbfbf9] px-4 transition focus-within:border-[#7c3aed] focus-within:ring-4 focus-within:ring-[#7c3aed]/10 ${errors.email ? 'border-red-400' : 'border-[#dfdfd8]'}`}>
                        <Mail size={18} className="shrink-0 text-[#888891]" aria-hidden="true" />
                        <input id="leader-email" type="email" inputMode="email" autoComplete="email" placeholder="Enter your registered Gmail address" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : 'email-hint'} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a0a0a6]" {...register('email')} onKeyDown={guardImeEnter} />
                      </div>
                      {errors.email ? <p id="email-error" className="mt-2 text-xs text-red-700" role="alert">{errors.email.message}</p> : <p id="email-hint" className="mt-2 text-xs text-[#898991]">Must match the email on your team registration.</p>}
                    </div>
                    <AnimatePresence>
                      {notice && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role={notice.kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl px-4 py-3 text-xs leading-5 ${notice.kind === 'error' ? 'bg-[#fff2f0] text-[#a33b30]' : 'bg-[#f3f8e3] text-[#46521d]'}`}>
                        {notice.kind === 'error' ? <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : <Check size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
                        {notice.text}
                      </motion.div>}
                    </AnimatePresence>
                    <Button type="submit" disabled={isSubmitting} className="h-14 w-full rounded-xl bg-[#111116] text-xs font-black tracking-[.12em] text-white hover:bg-[#34343b]">
                      {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <>VERIFY &amp; MARK ATTENDANCE <ArrowRight data-icon="inline-end" aria-hidden="true" /></>}
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="border-t border-[#efefea] bg-[#fafaf8] px-5 py-4 text-center text-[10px] text-[#87878e] sm:px-8">{details.detail}</div>
        </motion.div>
      </section>
    </main>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 py-3"><dt className="text-xs text-[#777780]">{label}</dt><dd className="text-right text-xs font-bold">{value}</dd></div>
}
