"use client";

import { useEffect, useState } from "react";

const BEFORE_MOUNT = new Date(0);

/**
 * Start of today, read on the client after mount. Pages are prerendered, so "today" must
 * not be evaluated during render (it would freeze at build time). Before mount this
 * returns the epoch, i.e. no date restriction; date pickers only open after interaction.
 */
export function useToday(): Date {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setToday(d);
  }, []);
  return today ?? BEFORE_MOUNT;
}
