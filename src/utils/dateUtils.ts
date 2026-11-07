// Date utility functions.

/** Returns today's date as 'YYYY-MM-DD'. */
export function today(): string {
  return formatDate(new Date());
}

/** Formats a Date object to 'YYYY-MM-DD'. */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Formats a 'YYYY-MM-DD' string to a Japanese display string 'YYYY年MM月DD日'. */
export function formatDateJP(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[0]}年${parts[1]}月${parts[2]}日`;
}

/** Returns true if dateStr is on or before refDate (inclusive). */
export function isOnOrBefore(dateStr: string, refDate: string): boolean {
  return dateStr <= refDate;
}

/** Returns true if dateStr is on or after refDate (inclusive). */
export function isOnOrAfter(dateStr: string, refDate: string): boolean {
  return dateStr >= refDate;
}

/** Returns true if dateStr is between start and end (inclusive on both ends). */
export function isBetween(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

// Calculate completed years on a local calendar date; age is never persisted.
export function calculateAge(birthDate?: string, onDate = today()): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate > onDate) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const [y, m, d] = onDate.split('-').map(Number);
  return y - year - (m < month || (m === month && d < day) ? 1 : 0);
}
