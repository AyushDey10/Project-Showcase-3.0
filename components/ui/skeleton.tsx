import React from 'react'
import { cn } from '@/lib/utils'

/**
 * Shared skeleton primitives.
 *
 * Deliberately server-safe (no hooks, no 'use client') so the same components
 * can back `loading.tsx` route files and client-side data states.
 *
 * Shapes mirror the real design system: rounded cards on --card, muted bars,
 * borders from --border. `.skeleton` (see globals.css) owns the shimmer and
 * opts out of animation under `prefers-reduced-motion`.
 */

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('skeleton rounded-lg', className)}
      {...props}
    />
  )
}

export function SkeletonText({
  lines = 3,
  className,
  lineClassName,
}: {
  lines?: number
  className?: string
  lineClassName?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            'h-3',
            index === lines - 1 ? 'w-2/3' : 'w-full',
            lineClassName
          )}
        />
      ))}
    </div>
  )
}

/** Matches the shape of `StatCard` / a compact summary tile. */
export function SkeletonCard({
  className,
  lines = 2,
}: {
  className?: string
  lines?: number
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-5 shadow-sm',
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="size-9 shrink-0 rounded-xl" />
      </div>
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn('h-3', index === 0 ? 'w-40' : 'w-28')}
          />
        ))}
      </div>
    </div>
  )
}

/** A single table row placeholder; drop it straight into a real `<tbody>`. */
export function SkeletonRow({
  columns = 6,
  className,
}: {
  columns?: number
  className?: string
}) {
  return (
    <tr className={cn('border-b border-border/50 last:border-0', className)} aria-hidden="true">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-4 py-3.5">
          <Skeleton
            className={cn(
              'h-3.5',
              index === 0
                ? 'w-14'
                : index === 1
                  ? 'w-full max-w-[220px]'
                  : index === columns - 1
                    ? 'ml-auto w-16'
                    : 'w-20'
            )}
          />
          {index === 1 && (
            <Skeleton className="mt-2 h-3 w-24 opacity-70" />
          )}
        </td>
      ))}
    </tr>
  )
}

/** Card + table shell with skeleton header cells and rows. */
export function SkeletonTable({
  columns = 6,
  rows = 6,
  className,
}: {
  columns?: number
  rows?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card shadow-sm',
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border/80 bg-muted/40 px-4 py-3.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <SkeletonRow key={index} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Generic page frame: title block, filter bar, table. Used by route loading files. */
export function PageLoadingSkeleton({
  rows = 8,
  columns = 7,
  showFilters = true,
}: {
  rows?: number
  columns?: number
  showFilters?: boolean
}) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page content">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      {showFilters && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Skeleton className="h-10 w-full max-w-md rounded-xl" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-44 rounded-xl" />
              <Skeleton className="h-9 w-52 rounded-xl" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      )}

      <SkeletonTable columns={columns} rows={rows} />
      <span className="sr-only">Loading data…</span>
    </div>
  )
}

/** Dashboard-specific frame: stat grid, clearance banner, progress panels, activity list. */
export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading dashboard statistics">
      <section aria-label="Key Statistics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </section>

      <Skeleton className="h-[92px] w-full rounded-2xl" />

      <section aria-label="Verification Progress">
        <div className="space-y-2">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="space-y-4 rounded-2xl border border-border bg-card p-5"
              aria-hidden="true"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-9 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
              <div className="flex items-center justify-between border-t border-border/60 pt-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Recent Activity">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-8 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-44" />
                <Skeleton className="h-2.5 w-56" />
              </div>
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="divide-y divide-border/60">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
                aria-hidden="true"
              >
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-3.5 w-56 max-w-full" />
                  <Skeleton className="h-2.5 w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <span className="sr-only">Loading dashboard data…</span>
    </div>
  )
}
