import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Project Showcase 2026 · Student Cabinet',
    template: '%s | Project Showcase 2026',
  },
  description: 'Fast, secure team attendance check-in for Project Showcase 2026, hosted by the Student Cabinet at Bennett University.',
  applicationName: 'Project Showcase Attendance',
  generator: 'v0.app',
  icons: { icon: '/icon.svg' },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#fff8fa',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="light" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try { var theme = localStorage.getItem('student-attendance-theme'); var root = document.documentElement; if (theme === 'dark') { root.dataset.theme = 'dark'; root.classList.remove('light'); root.classList.add('dark'); } } catch (_) {}`,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
