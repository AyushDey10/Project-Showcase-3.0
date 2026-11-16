import Link from 'next/link'
import Image from 'next/image'
import { ThemeToggle } from '@/components/theme-toggle'
import { ArrowDownRight, ArrowUpRight, ArrowUpRightFromSquare, ScanLine, ShieldCheck, Sparkles } from 'lucide-react'

const destinations = [
  {
    href: '/attendance/internal',
    code: '01',
    title: 'Bennett University',
    label: 'Internal teams',
    description: 'For registered teams from Bennett University.',
    accent: 'lime',
  },
  {
    href: '/attendance/external',
    code: '02',
    title: 'Other institutions',
    label: 'External teams',
    description: 'For registered teams joining us from elsewhere.',
    accent: 'violet',
  },
]

export function ShowcaseHome() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f7f4] text-[#111116]">
      <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-14">
        <Link href="/" aria-label="Project Showcase home" className="flex items-center gap-3">
          <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[#e5e5df] bg-[#ffffff] p-1 shadow-sm dark:border-white/15">
            <Image
              src="/student-cabinet-logo.png"
              alt="Student Cabinet logo"
              width={44}
              height={44}
              priority
              className="size-full object-contain"
            />
          </span>
          <span className="leading-tight">
            <span className="block text-[11px] font-bold uppercase tracking-[.18em]">Student Cabinet</span>
            <span className="block text-xs text-[#777780]">Bennett University</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <span className="hidden items-center gap-2 rounded-full border border-[#e5e5df] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#64646b] sm:flex">
            <span className="size-2 rounded-full bg-[#c6f135]" /> Project Showcase 2026
          </span>
          <Link href="/admin/login" className="inline-flex h-10 items-center gap-2 rounded-full border border-[#deded7] px-4 text-xs font-bold transition hover:border-[#111116] hover:bg-white">
            Admin <ArrowUpRightFromSquare size={14} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="relative mx-auto grid w-full max-w-[1440px] gap-10 px-5 pb-14 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:px-14 lg:pb-20 lg:pt-20">
        <div className="relative z-10">
          <div className="mb-7 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.2em] text-[#6c6c73]">
            <span className="grid size-8 place-items-center rounded-full bg-[#c6f135]"><Sparkles size={15} aria-hidden="true" /></span>
            Project Showcase · Student Cabinet
          </div>
          <h1 className="max-w-[820px] text-[clamp(2.25rem,6.1vw,6.25rem)] font-black leading-[.89] tracking-[-.075em]">
            YOUR PROJECT.<br />YOUR TEAM.<br /><span className="relative inline-block">YOUR PRESENCE.<span className="absolute -bottom-1 left-0 -z-0 h-[.18em] w-full bg-[#c6f135]" /></span>
          </h1>
          <p className="mt-8 max-w-lg text-base leading-7 text-[#65656c] sm:text-lg">
            Welcome to Project Showcase. Verify your team&apos;s attendance in seconds with the registered team leader Gmail ID.
          </p>
          <a href="#check-in" className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#111116] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#34343b]">
            Find your check-in <ArrowDownRight size={17} aria-hidden="true" />
          </a>
        </div>

        <div className="relative mx-auto w-full max-w-[530px] lg:ml-auto lg:mr-0">
          <div className="absolute -right-12 -top-10 size-48 rounded-full bg-[#dcd1ff] blur-3xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[28px] border border-[#e7e6df] bg-white p-5 shadow-[0_28px_80px_-45px_rgba(24,24,32,.32)] sm:p-7">
            <div className="flex items-center justify-between border-b border-[#eeeeea] pb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#8b8b91]">Attendance desk</p>
                <p className="mt-1 text-xl font-extrabold tracking-tight">Check in, together.</p>
              </div>
              <span className="grid size-12 place-items-center rounded-2xl bg-[#f2efff] text-[#6738da]"><ScanLine size={23} aria-hidden="true" /></span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-7">
              <div className="rounded-2xl bg-[#f5f7ec] p-4 sm:p-5">
                <span className="text-[10px] font-black uppercase tracking-[.16em] text-[#616558]">Internal</span>
                <p className="mt-3 text-3xl font-black tracking-[-.06em]">BU</p>
                <p className="mt-1 text-xs text-[#73756d]">Bennett University</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#a0a0a5]">or</span>
              <div className="rounded-2xl bg-[#f2efff] p-4 sm:p-5">
                <span className="text-[10px] font-black uppercase tracking-[.16em] text-[#716493]">External</span>
                <p className="mt-3 text-3xl font-black tracking-[-.06em]">∞</p>
                <p className="mt-1 text-xs text-[#797485]">Other institutions</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-[#111116] p-4 text-white">
              <ShieldCheck className="mt-0.5 shrink-0 text-[#c6f135]" size={18} aria-hidden="true" />
              <p className="text-xs leading-5 text-white/75">One verified team-leader email marks the whole registered team present.</p>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-5 hidden rotate-[-5deg] rounded-xl bg-[#c6f135] px-4 py-3 text-[10px] font-black uppercase tracking-[.14em] shadow-lg sm:block">Built for the big day</div>
        </div>
      </section>

      <section id="check-in" className="bg-white px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#7c3aed]">Choose the QR route you scanned</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-.055em] sm:text-4xl">Your team starts here.</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[#71717a]">Use only the attendance route that matches your registered institution category.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {destinations.map((item) => {
              const isExternal = item.code === '02'
              return (
                <Link
                  key={item.code}
                  href={item.href}
                  data-card={isExternal ? 'external-teams' : undefined}
                  className={`group flex min-h-[220px] flex-col justify-between rounded-[24px] border p-6 transition duration-200 hover:-translate-y-1 sm:p-8 ${
                    item.accent === 'lime'
                      ? 'border-[#e7ead7] bg-[#f8faef] hover:border-[#c6f135]'
                      : 'border-[#e5def9] bg-[#f8f6ff] hover:border-[#7c3aed] dark:border-[#e5def9] dark:bg-[#f8f6ff] dark:hover:border-[#7c3aed]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] ${
                        isExternal ? 'external-card-label dark:!text-[#000000]' : ''
                      }`}
                    >
                      {item.label}
                    </span>
                    <span
                      className={`text-sm font-bold text-[#9a9aa0] ${
                        isExternal ? 'external-card-code dark:!text-[#000000]' : ''
                      }`}
                    >
                      {item.code}
                    </span>
                  </div>
                  <div className="mt-8 flex items-end justify-between gap-4">
                    <div>
                      <h3
                        className={`text-2xl font-black tracking-[-.05em] sm:text-3xl ${
                          isExternal ? 'external-card-title dark:!text-[#000000]' : ''
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p
                        className={`mt-2 text-sm text-[#686871] ${
                          isExternal ? 'external-card-description dark:!text-[#000000]' : ''
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                    <span
                      className={`grid size-12 shrink-0 place-items-center rounded-full transition group-hover:rotate-45 ${
                        item.accent === 'lime' ? 'bg-[#c6f135]' : 'bg-[#7c3aed] text-white'
                      }`}
                    >
                      <ArrowUpRight size={20} aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-6 text-[11px] text-[#777780] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-14">
        <span>© 2026 Student Cabinet · Bennett University</span>
        <span>Project Showcase · Team attendance portal</span>
      </footer>
    </main>
  )
}
