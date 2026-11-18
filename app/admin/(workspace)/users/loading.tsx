import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/ui/skeleton'

export default function AdminUsersLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading administrator accounts">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-40 rounded-xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} lines={1} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
        <Skeleton className="h-9 w-56 rounded-xl" />
      </div>

      <SkeletonTable columns={6} rows={5} />
      <span className="sr-only">Loading administrators…</span>
    </div>
  )
}
