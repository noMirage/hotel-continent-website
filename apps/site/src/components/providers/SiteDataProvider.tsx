"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteData } from "@/lib/data";

const SiteDataContext = createContext<SiteData | null>(null);

/** Server-fetched, cached public data, handed to client islands so they render in the initial HTML. */
export function SiteDataProvider({ data, children }: { data: SiteData; children: ReactNode }) {
  return <SiteDataContext.Provider value={data}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteData {
  const ctx = useContext(SiteDataContext);
  if (!ctx) throw new Error("useSiteData must be used within SiteDataProvider");
  return ctx;
}
