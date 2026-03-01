import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-32" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </CardContent>
      <CardFooter className="flex-col items-start gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </CardFooter>
    </Card>
  );
}

export function MethodDetailSkeleton() {
  return (
    <div className="relative container mx-auto rounded bg-white p-6 shadow">
      <div className="space-y-8">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-10 w-3/5" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-9/12" />
          </div>

          <Skeleton className="h-4 w-36" />
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="order-2 rounded-xl border border-gray-300 bg-gray-100 p-5 dark:border-gray-700 dark:bg-gray-900/40 lg:order-1">
              <div className="space-y-8">
                <div className="rounded-md border border-gray-300 bg-gray-200 p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-10/12" />
                  </div>
                </div>

                <div className="rounded-md border border-gray-300 bg-gray-200 p-5 dark:border-gray-700 dark:bg-gray-800">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-10/12" />
                    <Skeleton className="h-4 w-7/12" />
                  </div>
                </div>

                <div className="space-y-5">
                  <Skeleton className="h-6 w-44" />
                  <Skeleton className="h-20 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>

                <div className="space-y-5">
                  <Skeleton className="h-6 w-60" />
                  <Skeleton className="h-20 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>

                <Skeleton className="h-72 w-full rounded-xl" />
              </div>
            </div>

            <div className="order-1 flex flex-col gap-4 lg:order-2">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
