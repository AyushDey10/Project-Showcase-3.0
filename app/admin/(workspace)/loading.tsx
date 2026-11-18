import { DashboardLoadingSkeleton, Skeleton } from '@/components/ui/skeleton'

/**
 * Fallback for the dashboard index while its session check resolves.
 * Every child route ships its own loading.tsx, so this file only covers `/admin`
 * itself. It mirrors PageContainer's header plus the dashboard body skeleton.
 */
export default function DashboardRouteLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-3.5 w-96 max-w-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-9 w-40 rounded-xl" />
        </div>
      </div>
      <DashboardLoadingSkeleton />
    </div>
  )
}
