import { LoadingRegion, Skeleton } from "@/shared/ui";

export default function DashboardLoading() {
  return (
    <LoadingRegion
      label="Загружаем раздел приложения…"
      className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
    >
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-4 h-10 w-72 max-w-full" />
      <Skeleton className="mt-3 h-5 w-[34rem] max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-72" />
        ))}
      </div>
    </LoadingRegion>
  );
}
