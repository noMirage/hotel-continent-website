"use client";

import dynamic from "next/dynamic";

// The date picker (react-day-picker + date-fns, ~45 KB gzip) only appears inside popovers,
// so it is loaded on first open instead of with the page.
export const Calendar = dynamic(() => import("./calendar").then((m) => m.Calendar), {
  ssr: false,
  loading: () => <div className="h-[300px] w-[276px] p-3" aria-busy="true" />,
});
