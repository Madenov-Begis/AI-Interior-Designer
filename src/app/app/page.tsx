"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { apiData } from "@/lib/api/client";

export default function AppEntryPage() {
  const router = useRouter();
  const entry = useQuery({
    queryKey: ["project-entry"],
    queryFn: () =>
      apiData<{ projectId: string }>({
        url: "/projects/entry",
        method: "POST",
      }),
    retry: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (entry.data?.projectId) {
      router.replace(`/app/${entry.data.projectId}`);
    }
  }, [entry.data?.projectId, router]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
      <div className="grid max-w-sm justify-items-center gap-4 text-center">
        {entry.isError ? (
          <>
            <p className="text-sm text-destructive" role="alert">
              {entry.error.message}
            </p>
            <Button onClick={() => entry.refetch()}>Повторить</Button>
          </>
        ) : (
          <>
            <LoaderCircle
              className="size-7 animate-spin text-primary"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              Открываем рабочее пространство…
            </p>
          </>
        )}
      </div>
    </main>
  );
}
