"use client";

import dynamic from "next/dynamic";

export const DashboardChartsLoader = dynamic(
  () => import("./dashboard-charts").then((m) => ({ default: m.DashboardCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] animate-pulse rounded-lg bg-muted" aria-label="Loading charts" />
    ),
  }
);
