import { Skeleton } from '@/components/ui/skeleton'

/**
 * Placeholder that mirrors the real Team Details layout (header, summary cards,
 * reporting-location tiles, checkpoint panels, member table) so the page frame
 * is visible before the team payload arrives and does not jump when it does.
 */
export function TeamDetailSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading team details">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-9 w-40 rounded-xl" />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-3 h-3 w-64" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="ml-auto h-3.5 w-20" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading team details…</span>
    </div>
  )
}
