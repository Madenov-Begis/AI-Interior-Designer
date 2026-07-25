import { permanentRedirect } from "next/navigation";

export default async function LegacyProjectDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/app/${id}`);
}
