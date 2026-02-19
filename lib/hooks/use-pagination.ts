/**
 * usePagination — manages page state for paginated API lists.
 *
 * Web Vitals impact: LCP / INP
 *  - Smaller payloads → faster initial render (LCP).
 *  - Page transitions are instant (no large re-renders).
 */

"use client";
import { useState, useCallback } from "react";

export function usePagination(initialPageSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);

  const goToPage = useCallback((n: number) => setPage(n), []);
  const nextPage = useCallback(() => setPage((p) => p + 1), []);
  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const reset = useCallback(() => setPage(1), []);

  return { page, pageSize, goToPage, nextPage, prevPage, reset };
}
