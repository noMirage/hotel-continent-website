import { addDays, differenceInDays, isSameDay } from "date-fns";

export interface StayLayout {
  /** Column of the first visible night (0 = startDate). */
  startCol: number;
  /** Number of visible nights. 0 only for a check-out stub (see below). */
  span: number;
  /** The check-in day is inside the window (the bar starts mid-cell). */
  isActualStart: boolean;
  /** The check-out day is inside the window (the bar ends mid-cell). */
  isActualEnd: boolean;
}

/**
 * Column layout of a stay [checkIn, checkOut) inside the visible window
 * [startDate, endDate] (both inclusive, midnight-normalised).
 *
 * Returns null when the stay does not touch the window.
 *
 * A stay whose last night was before the window but which checks out exactly on
 * startDate is returned as a *check-out stub*: startCol 0, span 0, isActualEnd true.
 * The grid draws it as the half cell before the check-out (left edge → middle of
 * the first column), so staff see which rooms leave today without scrolling back.
 * A stub occupies no night, so a new check-in on that day stays possible.
 */
export function layoutStay(checkIn: Date, checkOut: Date, startDate: Date, endDate: Date): StayLayout | null {
  if (checkOut <= checkIn) return null;

  const isActualStart = checkIn >= startDate;
  const isActualEnd   = checkOut <= endDate;
  const visStart   = isActualStart ? checkIn : startDate;
  const clippedEnd = addDays(endDate, 1);
  const visEnd     = checkOut > clippedEnd ? clippedEnd : checkOut;
  const startCol   = differenceInDays(visStart, startDate);
  const span       = differenceInDays(visEnd, visStart);

  if (span < 0) return null;
  if (span === 0) {
    const isCheckOutStub = !isActualStart && isSameDay(checkOut, startDate);
    if (!isCheckOutStub) return null;
  }
  return { startCol, span, isActualStart, isActualEnd };
}
