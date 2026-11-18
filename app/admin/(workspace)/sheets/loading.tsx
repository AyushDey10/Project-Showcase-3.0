import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'

export default function SheetsLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading Google Sheets status">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-3.5 w-96 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-11 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>

      <Skeleton className="h-40 w-full rounded-2xl" />
      <span className="sr-only">Loading Google Sheets connection…</span>
    </div>
  )
}
