import { Skeleton } from "@/components/ui/skeleton";

export function MethodUpsertSkeleton() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-4 md:px-6">
      <div className="rounded-2xl border border-border/70 bg-muted/[0.14] p-5 shadow-sm">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-10 w-56" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border/70 bg-muted/[0.18] p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-72" />
              </div>
              <Skeleton className="h-16 w-56 rounded-xl" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-24 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="hidden md:block" />
              <div className="space-y-2 md:col-span-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/[0.18] p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-80" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            <div className="mb-4 rounded-lg border border-border/60 bg-background/65 p-3">
              <Skeleton className="h-4 w-64" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={`method-upsert-skeleton-variant-${index}`}
                  className="rounded-xl border border-border/60 bg-background/70 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Skeleton className="h-5 w-40" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full md:col-span-2" />
                  </div>
                </div>
              ))}
            </div>

            <Skeleton className="mt-4 h-11 w-full" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-6">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="mt-2 h-4 w-44" />
            <Skeleton className="mt-6 h-10 w-full" />
            <Skeleton className="mt-3 h-10 w-full" />
            <Skeleton className="mt-3 h-4 w-full" />
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/[0.14] p-6">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="mt-2 h-4 w-40" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
