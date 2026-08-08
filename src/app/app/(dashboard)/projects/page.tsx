import { ProjectsListPage } from "@/pages/projects-list";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    search?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const value = params.page;
  const searchValue = params.search;
  const requestedPage = Number.parseInt(
    Array.isArray(value) ? (value[0] ?? "1") : (value ?? "1"),
    10,
  );
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const search = (
    Array.isArray(searchValue) ? (searchValue[0] ?? "") : (searchValue ?? "")
  )
    .trim()
    .slice(0, 120);

  return <ProjectsListPage page={page} search={search} />;
}
