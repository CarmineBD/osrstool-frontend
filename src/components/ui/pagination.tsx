// src/components/ui/pagination.tsx
import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function PaginationRoot({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
  size?: React.ComponentProps<typeof Button>["size"];
} & Omit<
  React.ComponentProps<typeof Button>,
  "variant" | "size" | "type" | "aria-current"
>;

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      type="button"
      variant={isActive ? "outline" : "ghost"}
      size={size}
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(className)}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

interface PaginationProps {
  page: number;
  pageCount: number;
  hasNext?: boolean;
  onPageChange: (page: number) => void;
  maxButtons?: number;
}

function Pagination({
  page,
  pageCount,
  hasNext,
  onPageChange,
  maxButtons = 10,
}: PaginationProps) {
  const currentPage = Math.max(1, Math.min(page, Math.max(1, pageCount)));
  const safePageCount = Math.max(1, pageCount);
  const canGoPrevious = currentPage > 1;
  const canGoNext = hasNext ?? currentPage < safePageCount;

  const goToPage = React.useCallback(
    (nextPage: number) => {
      const targetPage = Math.max(1, Math.min(nextPage, safePageCount));
      if (targetPage !== currentPage) {
        onPageChange(targetPage);
      }
    },
    [currentPage, onPageChange, safePageCount]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === "ArrowLeft" && canGoPrevious) {
      event.preventDefault();
      goToPage(currentPage - 1);
      return;
    }

    if (event.key === "ArrowRight" && canGoNext) {
      event.preventDefault();
      goToPage(currentPage + 1);
      return;
    }

    if (event.key === "Home" && currentPage !== 1) {
      event.preventDefault();
      goToPage(1);
      return;
    }

    if (event.key === "End" && currentPage !== safePageCount) {
      event.preventDefault();
      goToPage(safePageCount);
    }
  };

  const windowStart =
    Math.floor((currentPage - 1) / maxButtons) * maxButtons + 1;
  const windowEnd = Math.min(windowStart + maxButtons - 1, safePageCount);
  const visiblePages = Array.from(
    { length: windowEnd - windowStart + 1 },
    (_, index) => windowStart + index
  );

  if (safePageCount <= 1 && !hasNext) {
    return null;
  }

  return (
    <PaginationRoot>
      <span className="sr-only" aria-live="polite">
        {`Page ${currentPage} of ${safePageCount}`}
      </span>
      <PaginationContent onKeyDown={handleKeyDown}>
        <PaginationItem>
          <PaginationPrevious
            disabled={!canGoPrevious}
            aria-disabled={!canGoPrevious}
            onClick={() => goToPage(currentPage - 1)}
          />
        </PaginationItem>

        {windowStart > 1 && (
          <>
            <PaginationItem>
              <PaginationLink
                isActive={currentPage === 1}
                aria-label="Go to page 1"
                onClick={() => goToPage(1)}
              >
                1
              </PaginationLink>
            </PaginationItem>
            {windowStart > 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
          </>
        )}

        {visiblePages.map((pageNumber) => (
          <PaginationItem key={pageNumber}>
            <PaginationLink
              isActive={pageNumber === currentPage}
              aria-label={
                pageNumber === currentPage
                  ? `Current page, page ${pageNumber}`
                  : `Go to page ${pageNumber}`
              }
              onClick={() => goToPage(pageNumber)}
            >
              {pageNumber}
            </PaginationLink>
          </PaginationItem>
        ))}

        {windowEnd < safePageCount && (
          <>
            {windowEnd < safePageCount - 1 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationLink
                isActive={currentPage === safePageCount}
                aria-label={`Go to page ${safePageCount}`}
                onClick={() => goToPage(safePageCount)}
              >
                {safePageCount}
              </PaginationLink>
            </PaginationItem>
          </>
        )}

        <PaginationItem>
          <PaginationNext
            disabled={!canGoNext}
            aria-disabled={!canGoNext}
            onClick={() => goToPage(currentPage + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
