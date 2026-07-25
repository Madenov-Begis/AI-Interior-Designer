import { redirect } from "next/navigation";
import { getOrCreateEntryProject } from "@/features/projects/service";
import {
  requireCurrentUser,
  UnauthorizedError,
  upsertProfileFromAuthUser,
} from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function AppEntryPage() {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    throw error;
  }

  await upsertProfileFromAuthUser(user);
  const project = await getOrCreateEntryProject(user.id);
  redirect(`/app/${project.id}`);
}
