/** A calendar month: `month` is 1-12. Years run 1970-9999, the range `?month=` accepts. */
export type Month = { year: number; month: number };

/** One cell of a Mon-Sun month grid: a day of the month, or a blank pad before day 1 or after the last day. */
export type GridCell = { date: string; day: number; weekday: string; weekdayShort: string } | null;

const FIRST: Month = { year: 1970, month: 1 };
const LAST: Month = { year: 9999, month: 12 };
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM", the `?month=` value for a month. */
export function monthParam({ year, month }: Month): string {
  return `${year}-${pad(month)}`;
}

/** The `?month=` value as a month, or the month of `today` (YYYY-MM-DD) when it is missing or invalid. */
export function parseMonth(value: string, today: string): Month {
  const match = MONTH_PATTERN.exec(value);
  const year = Number(match?.[1]);
  if (match && year >= FIRST.year) return { year, month: Number(match[2]) };
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

/** The month `step` months away, or null past 1970-01 or 9999-12. */
export function shiftMonth({ year, month }: Month, step: -1 | 1): Month | null {
  const index = year * 12 + (month - 1) + step;
  if (index < FIRST.year * 12 || index > LAST.year * 12 + 11) return null;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Dates are built in UTC so the weekday and month names never depend on the server's zone. */
function utcDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day); // rolls over like Date.UTC: day 0 is the previous month's last day
  return date;
}

const formatter = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" });
const MONTH_TITLE = formatter({ month: "long", year: "numeric" });
const MONTH_NAME = formatter({ month: "long" });
const WEEKDAY = formatter({ weekday: "long" });
const WEEKDAY_SHORT = formatter({ weekday: "short" });

/** "November 2026". */
export function monthTitle({ year, month }: Month): string {
  return MONTH_TITLE.format(utcDate(year, month, 1));
}

/** "November". */
export function monthName({ year, month }: Month): string {
  return MONTH_NAME.format(utcDate(year, month, 1));
}

/** The month's days in Mon-Sun weeks, padded with blank cells to whole weeks. */
export function monthGrid({ year, month }: Month): GridCell[] {
  const days = utcDate(year, month + 1, 0).getUTCDate();
  const lead = (utcDate(year, month, 1).getUTCDay() + 6) % 7; // Monday = 0
  const cells: GridCell[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day++) {
    const date = utcDate(year, month, day);
    cells.push({
      date: `${year}-${pad(month)}-${pad(day)}`,
      day,
      weekday: WEEKDAY.format(date),
      weekdayShort: WEEKDAY_SHORT.format(date),
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

