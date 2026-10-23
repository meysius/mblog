const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const short = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const long = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

/** "Oct 23" */
export const formatMonthDay = (date: Date) => monthDay.format(date);
/** "Oct 23, 2026" */
export const formatShortDate = (date: Date) => short.format(date);
/** "October 23, 2026" */
export const formatLongDate = (date: Date) => long.format(date);
