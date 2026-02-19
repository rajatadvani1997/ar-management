"use client";

import dynamic from "next/dynamic";

export const AgingChartsLoader = dynamic(
  () => import("./aging-charts").then((m) => ({ default: m.AgingCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] animate-pulse rounded-lg bg-muted" aria-label="Loading charts" />
    ),
  }
);
