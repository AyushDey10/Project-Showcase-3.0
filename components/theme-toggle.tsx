'use client'

import { Moon, Sun } from 'lucide-react'

export function ThemeToggle({ className = '' }: { className?: string }) {
  function toggleTheme() {
    const root = document.documentElement
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
    root.dataset.theme = theme
    root.classList.toggle('dark', theme === 'dark')
    root.classList.toggle('light', theme === 'light')

    try {
      window.localStorage.setItem('student-attendance-theme', theme)
    } catch {
      // The current-page theme still changes when storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark theme"
      title="Toggle light and dark theme"
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      <Sun className="theme-icon-sun size-4" aria-hidden="true" />
      <Moon className="theme-icon-moon size-4" aria-hidden="true" />
    </button>
  )
}
