'use client'

import React from 'react'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center space-y-4 shadow-xl">
          <h2 className="text-lg font-bold text-slate-100">Application Error</h2>
          <p className="text-xs text-slate-400">
            A critical system error occurred. Please try refreshing the application.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition"
          >
            Retry Application
          </button>
        </div>
      </body>
    </html>
  )
}
