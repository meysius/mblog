"use client";

import { useSyncExternalStore } from "react";
import { formatDateTime, formatMonthDayTime } from "@/lib/format";

// Times show in the browser's time zone, which the server doesn't know. They're
// left out of the server render and filled in once the page is running.
const subscribeToNothing = () => () => {};

/** False on the server and while hydrating, true after. */
export function useHydrated() {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}

/** "Oct 30, 2026, 9:00 AM" in the browser's time zone, or "Oct 30, 9:00 AM" when short. */
export function LocalDateTime({ date, short = false }: { date: Date; short?: boolean }) {
  const hydrated = useHydrated();
  return (
    <time dateTime={date.toISOString()}>
      {hydrated && (short ? formatMonthDayTime(date) : formatDateTime(date))}
    </time>
  );
}
