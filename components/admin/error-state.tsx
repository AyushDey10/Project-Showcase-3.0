'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  isRetrying?: boolean
  className?: string
  compact?: boolean
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  isRetrying = false,
  className,
  compact = false,
}: ErrorStateProps) {
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400',
          className
        )}
        role="alert"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle className="size-4 shrink-0 text-rose-400" />
          <span className="truncate">{message}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/20 px-2.5 py-1 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/30 disabled:opacity-50"
          >
            <RefreshCw className={cn('size-3', isRetrying && 'animate-spin')} />
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/5 py-12 px-6 text-center',
        className
      )}
      role="alert"
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
        <AlertTriangle className="size-6 stroke-[1.75]" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-foreground tracking-tight">
        {title}
      </h3>

      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{message}</p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={cn('size-4', isRetrying && 'animate-spin')} />
          Try Again
        </button>
      )}
    </div>
  )
}
