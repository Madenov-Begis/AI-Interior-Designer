export const dynamic = "force-dynamic";

// Только liveness HTTP-процесса. Не подтверждает доступность БД или provider.
export function GET() {
  return Response.json(
    { status: "ok" },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
