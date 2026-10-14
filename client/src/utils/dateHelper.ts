/**
 * @file dateHelper.ts
 * @description Intelligent travel date formatting, parsing, arithmetic, and automatic recommendation helpers.
 */

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
export const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Parses any flexible human or machine date string into a Date object at midnight local time.
 * Supports:
 * - "14 Oct 2026", "14 October 2026", "14-Oct-2026"
 * - "2026-10-14" (ISO)
 * - "14/10/2026", "14-10-2026" (DD/MM/YYYY)
 * - ISO timestamps
 */
export function parseDateString(val?: string | null): Date | null {
  if (!val || typeof val !== 'string') return null;
  const raw = val.trim();
  if (!raw) return null;

  // 1. Try ISO YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }

  // 2. Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }

  // 3. Try "14 Oct 2026" or "14 October 2026"
  const textMatch = raw.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (textMatch) {
    const d = parseInt(textMatch[1], 10);
    const monthStr = textMatch[2].toLowerCase();
    const y = parseInt(textMatch[3], 10);

    let m = MONTHS_SHORT.findIndex((ms) => ms.toLowerCase() === monthStr.slice(0, 3));
    if (m === -1) {
      m = MONTHS_LONG.findIndex((ml) => ml.toLowerCase() === monthStr);
    }
    if (m !== -1) {
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) return date;
    }
  }

  // 4. Try native Date parse fallback
  const fallback = new Date(raw);
  if (!isNaN(fallback.getTime())) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
  }

  return null;
}

/**
 * Formats a Date or date string to "14 Oct 2026"
 */
export function formatDateDisplay(val?: Date | string | null): string {
  if (!val) return '';
  const d = val instanceof Date ? val : parseDateString(val);
  if (!d || isNaN(d.getTime())) return typeof val === 'string' ? val : '';
  const day = d.getDate();
  const month = MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Formats a Date or date string to "14 October 2026"
 */
export function formatDateLong(val?: Date | string | null): string {
  if (!val) return '';
  const d = val instanceof Date ? val : parseDateString(val);
  if (!d || isNaN(d.getTime())) return typeof val === 'string' ? val : '';
  const day = d.getDate();
  const month = MONTHS_LONG[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Formats to "YYYY-MM-DD" for HTML input[type="date"]
 */
export function formatDateIso(val?: Date | string | null): string {
  if (!val) return '';
  const d = val instanceof Date ? val : parseDateString(val);
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Adds N days to a Date object safely
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Automatically computes "Previous Day Date + 1 day" formatted as "15 Oct 2026".
 * Returns null if previous date is missing or invalid.
 */
export function recommendNextDate(prevDateStr?: string | null): string | null {
  if (!prevDateStr) return null;
  const parsed = parseDateString(prevDateStr);
  if (!parsed) return null;
  const next = addDays(parsed, 1);
  return formatDateDisplay(next);
}

/**
 * Checks whether two date strings resolve to the exact same calendar day.
 */
export function isSameDate(d1?: string | null, d2?: string | null): boolean {
  if (!d1 || !d2) return false;
  const p1 = parseDateString(d1);
  const p2 = parseDateString(d2);
  if (!p1 || !p2) return d1.trim().toLowerCase() === d2.trim().toLowerCase();
  return (
    p1.getFullYear() === p2.getFullYear() &&
    p1.getMonth() === p2.getMonth() &&
    p1.getDate() === p2.getDate()
  );
}
