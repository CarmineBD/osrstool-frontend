import { Skeleton } from "@/components/ui/skeleton";

export function MethodUpsertSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <Skeleton className="h-10 w-56" />

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-5 flex items-center gap-2">
          <Skeleton className="h-6 w-10 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>

        <div className="space-y-6">
          <section className="space-y-4">
            <Skeleton className="h-5 w-28" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-1">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-28 w-full" />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <Skeleton className="h-4 w-48" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
          </section>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
