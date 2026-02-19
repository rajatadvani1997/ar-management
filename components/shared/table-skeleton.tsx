/**
 * TableSkeleton — CLS prevention component.
 *
 * CLS fix: renders a placeholder with the same height as the final table.
 * Without this, the page layout shifts when data loads (high CLS score).
 * With this, the space is reserved in advance (CLS → 0).
 *
 * LCP fix: skeleton renders immediately on the server (RSC) so the user
 * sees content-shaped feedback within the first paint (Suspense boundary).
 */

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-md border" aria-busy="true" aria-label="Loading table data">
      {/* Header row */}
      <div className="flex border-b bg-muted/40 px-4 py-3 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-4 flex-1 animate-pulse rounded bg-muted"
            style={{ maxWidth: i === 0 ? "8rem" : undefined }}
          />
        ))}
      </div>

      {/* Data rows — fixed height matches real table rows, preventing layout shift */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center border-b px-4 py-3 gap-4 last:border-0"
          style={{ minHeight: "48px" }} // matches table row height — CLS anchor
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-3 flex-1 animate-pulse rounded bg-muted/60"
              style={{ maxWidth: colIdx === 0 ? "6rem" : undefined, animationDelay: `${rowIdx * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Inline skeleton for a single stat card (dashboard use). */
export function StatCardSkeleton() {
  return (
    <div
      className="rounded-lg border bg-card p-6 space-y-3 animate-pulse"
      style={{ minHeight: "120px" }} // reserve space — CLS anchor
    >
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="h-8 w-32 rounded bg-muted" />
      <div className="h-3 w-16 rounded bg-muted/60" />
    </div>
  );
}
