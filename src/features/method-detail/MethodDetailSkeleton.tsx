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
    <div className="relative mx-auto max-w-5xl rounded bg-white p-6 shadow">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-10 w-3/5" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>

      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-9/12" />
      </div>

      <div className="mb-5">
        <Skeleton className="h-4 w-36" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="order-1 flex flex-col gap-2 lg:order-2 lg:col-span-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
          <div className="order-2 rounded-md border border-gray-300 bg-gray-200 p-4 dark:border-gray-700 dark:bg-gray-800 lg:order-1 lg:col-span-8">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-10/12" />
              <Skeleton className="h-4 w-7/12" />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-gray-300 bg-gray-200 px-4 py-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="space-y-3">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>

        <div className="rounded-md border border-gray-300 bg-gray-200 px-4 py-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="space-y-3">
            <Skeleton className="h-5 w-60" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>

        <div className="mt-4">
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
