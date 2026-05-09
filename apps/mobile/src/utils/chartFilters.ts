/**
 * Chart filter utilities — Shared date cutoff logic for chart filtering.
 * Eliminates the duplicated 1W/1M/3M/1Y/ALL date filtering code
 * that was copy-pasted across multiple useMemo blocks.
 */

export type ChartFilter = "1W" | "1M" | "3M" | "1Y" | "ALL";

/** Returns the cutoff Date for a given chart filter period. */
export function getCutoffDate(filter: ChartFilter): Date {
  if (filter === "ALL") return new Date(0);

  const now = new Date();
  switch (filter) {
    case "1W":
      now.setDate(now.getDate() - 7);
      return now;
    case "1M":
      now.setMonth(now.getMonth() - 1);
      return now;
    case "3M":
      now.setMonth(now.getMonth() - 3);
      return now;
    case "1Y":
      now.setFullYear(now.getFullYear() - 1);
      return now;
  }
}

/** Safely extract a JS Date from a Firestore timestamp or date string. */
export function toSafeDate(value: any): Date {
  if (!value) return new Date(0);
  if (value.toDate) return value.toDate();
  return new Date(value);
}
