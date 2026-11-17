'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingSpinner({
  size = 20,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <Loader2
      size={size}
      className={cn('animate-spin text-primary', className)}
      aria-label="Loading..."
    />
  )
}

export function LoadingState({
  message = 'Loading data...',
  description,
  className,
}: {
  message?: string
  description?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
      role="status"
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4">
        <LoadingSpinner size={24} className="text-primary" />
      </div>
      <p className="text-sm font-medium text-foreground">{message}</p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</p>
      )}
    </div>
  )
}

export function PageLoading({ message = 'Loading dashboard...' }: { message?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <LoadingState message={message} />
    </div>
  )
}

export function TableRowSkeleton({
  columns = 5,
  rows = 5,
}: {
  columns?: number
  rows?: number
}) {
  return (
    <div className="divide-y divide-border animate-pulse">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <div
              key={cIdx}
              className={cn(
                'h-4 rounded bg-muted',
                cIdx === 0 ? 'w-20' : cIdx === 1 ? 'w-48 flex-1' : 'w-28'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-border bg-card p-5 animate-pulse space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="size-9 rounded-xl bg-muted" />
            <div className="h-4 w-12 rounded bg-muted" />
          </div>
          <div className="h-7 w-28 rounded bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
