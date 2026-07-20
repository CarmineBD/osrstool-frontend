import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function MetricsCardSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden rounded-xl border-border/70">
      <CardHeader className="space-y-2 border-b border-border/60 pb-6">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="pt-6">
        <div className="divide-y divide-border/50">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={`metric-row-skeleton-${index}`}
              className="flex items-center justify-between gap-4 py-3"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MethodDetailSkeleton() {
  return (
    <div className="min-h-screen bg-surface-page">
      <div className="container mx-auto space-y-6 pt-6">
        <section className="space-y-4">
          <Skeleton className="h-4 w-36" />
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-9 w-3/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-10/12" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[max-content_minmax(0,1fr)]">
          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm lg:w-[5.5rem]">
            <div className="space-y-4">
              <Skeleton className="h-6 w-14" />
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton
                    key={`variant-selector-skeleton-${index}`}
                    className="h-11 w-full rounded-md"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
              <div className="order-2 space-y-6 lg:order-1">
                <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
                  <div className="space-y-4 p-6">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-40" />
                    <div className="rounded-lg border border-border/70 bg-card p-4">
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-10/12" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/60 p-6">
                    <div className="space-y-4">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-72 max-w-full" />
                      <div className="grid gap-6 md:grid-cols-2">
                        <Skeleton className="h-24 w-full rounded-lg" />
                        <Skeleton className="h-24 w-full rounded-lg" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/60 p-6">
                    <div className="space-y-4">
                      <Skeleton className="h-5 w-56" />
                      <Skeleton className="h-4 w-80 max-w-full" />
                      <div className="grid gap-6 xl:grid-cols-2">
                        <Skeleton className="h-28 w-full rounded-lg" />
                        <Skeleton className="h-28 w-full rounded-lg" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/60 p-6">
                    <div className="space-y-4">
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-4 w-96 max-w-full" />
                      <Skeleton className="h-72 w-full rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <MetricsCardSkeleton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
