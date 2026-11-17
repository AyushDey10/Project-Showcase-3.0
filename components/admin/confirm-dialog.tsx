'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AlertTriangle, AlertCircle, HelpCircle, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void | Promise<void>
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning'
  loading?: boolean
  requireReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  reasonMaxLength?: number
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
  requireReason = false,
  reasonLabel = 'Reason for this action',
  reasonPlaceholder = 'Please provide an audit explanation...',
  reasonMaxLength = 500,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setReason('')
      setError(null)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, loading, onClose])

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      setError('A reason is required to proceed with this action.')
      return
    }
    setError(null)
    await onConfirm(reason.trim() || undefined)
  }

  const iconVariants = {
    destructive: {
      wrapper: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      icon: AlertCircle,
    },
    warning: {
      wrapper: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      icon: AlertTriangle,
    },
    default: {
      wrapper: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
      icon: HelpCircle,
    },
  }

  const confirmBtnVariants = {
    destructive: 'bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-500',
    warning: 'bg-amber-600 text-white hover:bg-amber-500 focus-visible:ring-amber-500',
    default: 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring',
  }

  const { wrapper: iconWrapperClass, icon: IconComponent } = iconVariants[variant]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl border',
                iconWrapperClass
              )}
            >
              <IconComponent className="size-5" />
            </div>
            <div>
              <h2
                id="confirm-dialog-title"
                className="text-lg font-semibold text-foreground tracking-tight"
              >
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        {description && (
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}

        {requireReason && (
          <div className="mt-4 space-y-1.5">
            <label
              htmlFor="confirm-dialog-reason"
              className="text-xs font-medium text-foreground flex items-center justify-between"
            >
              <span>
                {reasonLabel} <span className="text-rose-400">*</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                {reason.length}/{reasonMaxLength}
              </span>
            </label>
            <textarea
              id="confirm-dialog-reason"
              rows={3}
              maxLength={reasonMaxLength}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError(null)
              }}
              placeholder={reasonPlaceholder}
              disabled={loading}
              className="w-full rounded-xl border border-input bg-background/60 p-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || (requireReason && !reason.trim())}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all shadow-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              confirmBtnVariants[variant]
            )}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
