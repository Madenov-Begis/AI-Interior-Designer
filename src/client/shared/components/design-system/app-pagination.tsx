import { cn } from "@/shared/lib";
import { getPaginationItems } from "@/shared/lib/pagination";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";

type AppPaginationProps = {
  page: number;
  pageCount: number;
  buildHref(page: number): string;
  className?: string;
};

export function AppPagination({
  page,
  pageCount,
  buildHref,
  className,
}: AppPaginationProps) {
  if (pageCount <= 1) return null;

  const currentPage = Math.min(Math.max(1, page), pageCount);
  const items = getPaginationItems(currentPage, pageCount);

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={buildHref(Math.max(1, currentPage - 1))}
            prefetch={false}
            aria-disabled={currentPage === 1}
            tabIndex={currentPage === 1 ? -1 : undefined}
            className={cn(
              currentPage === 1 && "pointer-events-none opacity-50",
            )}
          />
        </PaginationItem>

        {items.map((item, index) =>
          item === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                href={buildHref(item)}
                prefetch={false}
                isActive={item === currentPage}
                aria-label={`Перейти на страницу ${item}`}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href={buildHref(Math.min(pageCount, currentPage + 1))}
            prefetch={false}
            aria-disabled={currentPage === pageCount}
            tabIndex={currentPage === pageCount ? -1 : undefined}
            className={cn(
              currentPage === pageCount && "pointer-events-none opacity-50",
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
