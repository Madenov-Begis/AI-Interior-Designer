import { LoadingRegion } from "./loading-region";
import { Skeleton } from "./skeleton";

export function WorkspaceLoadingSkeleton({
  label,
  fullScreen = false,
}: {
  label: string;
  fullScreen?: boolean;
}) {
  return (
    <LoadingRegion
      label={label}
      className={`flex min-h-0 flex-col overflow-hidden bg-background ${fullScreen ? "h-dvh" : "h-full"}`}
    >
      {fullScreen ? (
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-border px-5 sm:px-8">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="size-10 rounded-full" />
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 min-[1200px]:grid-cols-[minmax(0,1fr)_380px]">
        <section className="page-grid grid min-h-0 place-items-center overflow-hidden px-4 py-6">
          <div className="w-full max-w-[400px] rounded-[18px] border border-border bg-card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Skeleton className="size-11 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-36 max-w-full" />
                <Skeleton className="h-4 w-52 max-w-full" />
              </div>
            </div>
            <Skeleton className="mt-5 h-44 w-full rounded-xl" />
            <Skeleton className="mt-3 h-3 w-44 max-w-full" />
          </div>
        </section>
        <aside className="hidden min-h-0 border-l border-border bg-card p-5 min-[1200px]:block">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-5 h-24 w-full rounded-xl" />
          <Skeleton className="mt-5 h-32 w-full rounded-xl" />
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <Skeleton className="mt-8 h-12 w-full rounded-xl" />
        </aside>
      </div>
    </LoadingRegion>
  );
}
