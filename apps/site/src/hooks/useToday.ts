"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Start of today, read on the client after hydration. Pages are prerendered, so "today"
 * must not be evaluated during server render (it would freeze at build time). The server
 * snapshot is the epoch, i.e. no date restriction; date pickers only open after interaction.
 */
const subscribe = () => () => {};

function todayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function useToday(): Date {
  const ms = useSyncExternalStore(subscribe, todayMs, () => 0);
  return useMemo(() => new Date(ms), [ms]);
}
