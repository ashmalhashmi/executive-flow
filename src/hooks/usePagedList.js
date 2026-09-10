import { useEffect, useMemo, useState } from 'react';

/**
 * Client-side list pagination — shared across Contacts, Orders, Tasks, etc.
 * Pass `resetKey` (e.g. search/filter string) to jump back to page 1 when filters change.
 */
export function usePagedList(items, { pageSize = 50, resetKey = '' } = {}) {
  const [page, setPage] = useState(1);
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);

  const pageItems = useMemo(
    () => list.slice(startIndex, endIndex),
    [list, startIndex, endIndex],
  );

  return {
    page: safePage,
    setPage,
    pageSize,
    total,
    totalPages,
    pageItems,
    startIndex,
    endIndex,
    showingLabel:
      total === 0 ? '0 of 0' : `Showing ${startIndex + 1}–${endIndex} of ${total}`,
  };
}
