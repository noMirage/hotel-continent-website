export const BLOCKING_STATUSES = ["UNPROCESSED", "PENDING", "CONFIRMED", "CHECK_IN"] as const;
export type BlockingStatus = typeof BLOCKING_STATUSES[number];

export const CALENDAR_STATUSES = ["UNPROCESSED", "PENDING", "CONFIRMED", "CHECK_IN", "CHECK_OUT"] as const;
export type CalendarStatus = typeof CALENDAR_STATUSES[number];

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "UNPROCESSED": return "bg-orange-100 text-orange-800";
    case "PENDING":     return "bg-accent text-accent-foreground";
    case "CONFIRMED":   return "bg-primary/10 text-primary";
    case "CHECK_IN":    return "bg-green-100 text-green-700";
    case "CHECK_OUT":   return "bg-stone-700 text-white";
    case "CANCELLED":
    case "DECLINED":    return "bg-destructive/10 text-destructive";
    default:            return "bg-muted text-muted-foreground";
  }
}
