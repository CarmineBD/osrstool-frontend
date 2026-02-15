import { lazy, Suspense } from "react";

export type Props = Record<string, never>;
const LazyMethodUpsert = lazy(() =>
  import("./MethodUpsert").then((module) => ({ default: module.MethodUpsert }))
);

export function MethodCreate(_props: Props) {
  void _props;
  return (
    <Suspense
      fallback={
        <p className="p-4 text-sm text-muted-foreground">Loading form...</p>
      }
    >
      <LazyMethodUpsert mode="create" />
    </Suspense>
  );
}

export default MethodCreate;
