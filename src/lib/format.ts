const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const short = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const long = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const monthDayTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Oct 23" */
export const formatMonthDay = (date: Date) => monthDay.format(date);
/** "Oct 23, 2026" */
export const formatShortDate = (date: Date) => short.format(date);
/** "October 23, 2026" */
export const formatLongDate = (date: Date) => long.format(date);
/** "Oct 23, 2026, 9:00 AM", in the time zone it's formatted in. */
export const formatDateTime = (date: Date) => dateTime.format(date);
/** "Oct 23, 9:00 AM", in the time zone it's formatted in. */
export const formatMonthDayTime = (date: Date) => monthDayTime.format(date);
/** "1 post", "12 posts" */
export const formatPostCount = (count: number) => `${count} ${count === 1 ? "post" : "posts"}`;
