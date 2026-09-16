/**
 * dateUtils.ts
 *
 * Centralized date manipulation engine adhering to the 6:00 AM Local Transition Rule.
 *
 * Operational rules:
 * - The new day begins at 06:00 AM local device time (NOT at 00:00 midnight and NEVER using UTC toISOString).
 * - Hours 00:00 - 05:59: Night planning phase belonging to the previous night's cycle.
 * - "Today" string (YYYY-MM-DD) reflects the effective active day.
 * - "Tomorrow" string (YYYY-MM-DD) reflects the upcoming daytime you are planning for.
 */

export const DAY_CUTOFF_HOUR = 6; // 6:00 AM

/**
 * Format Date as YYYY-MM-DD using local time (NOT UTC)
 */
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the effective "Today" Date object considering the 6:00 AM cutoff.
 * If current hour < 6, shifts back by 1 calendar day.
 */
export function getAppTodayDate(refDate: Date = new Date()): Date {
  const d = new Date(refDate);
  if (d.getHours() < DAY_CUTOFF_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

/**
 * Returns the effective "Today" date string (YYYY-MM-DD) in local time.
 */
export function getAppTodayDateString(refDate: Date = new Date()): string {
  return formatLocalDate(getAppTodayDate(refDate));
}

/**
 * Returns the effective "Tomorrow" date string (YYYY-MM-DD) in local time.
 * If before 6:00 AM, tomorrow's plan is the current calendar day (the daytime ahead).
 * If after 6:00 AM, tomorrow's plan is current calendar day + 1.
 */
export function getAppTomorrowDateString(refDate: Date = new Date()): string {
  const d = new Date(refDate);
  if (d.getHours() >= DAY_CUTOFF_HOUR) {
    d.setDate(d.getDate() + 1);
  }
  return formatLocalDate(d);
}

/**
 * Get ISO week label (e.g. "2026-W37") evaluated from Monday to Sunday.
 * Resets strictly on Monday at 6:00 AM.
 */
export function getAppWeekLabel(refDate: Date = new Date()): string {
  const effective = getAppTodayDate(refDate);
  const d = new Date(effective);
  d.setHours(0, 0, 0, 0);
  // Thursday in current week decides the ISO week year
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
  return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Returns next week's ISO week label (e.g. "2026-W38") for planning in advance.
 */
export function getAppNextWeekLabel(refDate: Date = new Date()): string {
  const effective = getAppTodayDate(refDate);
  const d = new Date(effective);
  d.setDate(d.getDate() + 7);
  return getAppWeekLabel(d);
}

/**
 * Get the Monday and Sunday date boundaries of the current calendar week.
 */
export function getCurrentWeekDateRange(refDate: Date = new Date()): {
  monday: Date;
  sunday: Date;
  days: string[]; // YYYY-MM-DD for each day Monday to Sunday
} {
  const effective = getAppTodayDate(refDate);
  const d = new Date(effective);
  const dayOfWeek = (d.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday

  const monday = new Date(d);
  monday.setDate(d.getDate() - dayOfWeek);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    days.push(formatLocalDate(cur));
  }

  return { monday, sunday, days };
}
