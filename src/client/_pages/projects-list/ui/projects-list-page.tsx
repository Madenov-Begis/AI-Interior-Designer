import { ProjectsGrid } from "@/features/manage-projects";

export function ProjectsListPage({
  page,
  search,
}: {
  page: number;
  search: string;
}) {
  return <ProjectsGrid key={search} page={page} initialSearch={search} />;
}
