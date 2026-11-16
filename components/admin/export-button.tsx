'use client'

import { Button } from '@/components/ui/button'
import { Download, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

export function ExportButton({ scope, query = '', category = '', status = '', label }: { scope: string; query?: string; category?: string; status?: string; label: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function download() {
    setBusy(true)
    setError('')
    try {
      const params = new URLSearchParams({ scope })
      if (query) params.set('q', query)
      if (category) params.set('category', category)
      if (status) params.set('status', status)
      const response = await fetch(`/api/admin/export?${params.toString()}`)
      if (!response.ok) {
        const body = await response.json() as { error?: string }
        setError(body.error ?? 'Export unavailable.')
        return
      }
      const blob = await response.blob()
      const href = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = href
      anchor.download = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] ?? 'Project_Showcase_Attendance_2026.xlsx'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(href)
    } catch {
      setError('Could not download the export. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="flex flex-col items-start gap-1"><Button type="button" variant="outline" size="sm" onClick={download} disabled={busy} className="h-9 rounded-lg border-[#deded8] bg-white px-3 text-xs font-bold">{busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />} {label}</Button>{error && <span className="max-w-[240px] text-[10px] leading-4 text-[#a33b30]" role="status">{error}</span>}</div>
}
