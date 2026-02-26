import { lazy, Suspense } from "react";
import { MethodUpsertSkeleton } from "@/features/method-upsert/MethodUpsertSkeleton";

export type Props = Record<string, never>;
const LazyMethodUpsert = lazy(() =>
  import("./MethodUpsert").then((module) => ({ default: module.MethodUpsert }))
);

export function MethodEdit(_props: Props) {
  void _props;
  return (
    <Suspense fallback={<MethodUpsertSkeleton />}>
      <LazyMethodUpsert mode="edit" />
    </Suspense>
  );
}

export default MethodEdit;
