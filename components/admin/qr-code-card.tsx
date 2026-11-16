'use client'

import QRCode from 'qrcode'
import { Check, Copy, Download, QrCode } from 'lucide-react'
import { useEffect, useState } from 'react'

type Category = 'internal' | 'external'

export function QrCodeCard({ category }: { category: Category }) {
  const [image, setImage] = useState('')
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')
  const path = `/attendance/${category}`
  const isInternal = category === 'internal'

  useEffect(() => {
    const baseUrl = window.location.origin
    setOrigin(baseUrl)
    QRCode.toDataURL(`${baseUrl}${path}`, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 1024,
      margin: 3,
      color: { dark: '#111116', light: '#ffffff' },
    }).then(setImage).catch(() => setImage(''))
  }, [path])

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(`${origin}${path}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const accent = isInternal ? 'bg-[#c6f135]' : 'bg-[#dcd1ff]'
  return (
    <article className="flex flex-col rounded-2xl border border-[#e7e7e1] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><span className={`inline-flex rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[.15em] ${accent}`}>{isInternal ? 'Internal teams' : 'External teams'}</span><h3 className="mt-3 text-lg font-black tracking-[-.04em]">{isInternal ? 'Bennett University' : 'Other institutions'}</h3><p className="mt-1 text-xs text-[#777780]">{isInternal ? 'BENNETT UNIVERSITY — INTERNAL TEAMS' : 'EXTERNAL PARTICIPANTS — OTHER COLLEGES'}</p></div>
        <QrCode className="text-[#777780]" size={19} aria-hidden="true" />
      </div>
      <div className="my-6 grid min-h-[220px] place-items-center rounded-2xl bg-[#fafaf8] p-4">
        {image ? <img src={image} alt={`${category} team attendance QR code`} className="size-[190px] rounded-lg bg-white p-2" /> : <div className="grid size-[190px] place-items-center rounded-lg border border-dashed border-[#dcdcd6] text-xs text-[#777780]">Creating QR code…</div>}
      </div>
      <p className="break-all rounded-lg bg-[#f5f5f2] px-3 py-2 text-[11px] text-[#686871]">{origin ? `${origin}${path}` : path}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={image || undefined} download={`Project_Showcase_${category}_Attendance_QR_2026.png`} aria-disabled={!image} className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold transition ${image ? 'bg-[#111116] text-white hover:bg-[#34343b]' : 'pointer-events-none bg-[#d8d8d4] text-[#777780]'}`}><Download size={15} aria-hidden="true" /> Download PNG</a>
        <button type="button" onClick={copyUrl} disabled={!origin} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e0e0da] px-3 text-xs font-bold transition hover:bg-[#f5f5f2] disabled:opacity-50">{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied ? 'Copied' : 'Copy URL'}</button>
      </div>
    </article>
  )
}
