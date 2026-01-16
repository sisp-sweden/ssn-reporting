import { format, parse, isValid } from 'date-fns';

/**
 * Format a date to ISO string (YYYY-MM-DD)
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(d)) {
    throw new Error(`Invalid date: ${date}`);
  }
  return format(d, 'yyyy-MM-dd');
}

/**
 * Format a date to ISO timestamp
 * @param {Date|string} date - The date to format
 * @returns {string} ISO timestamp string
 */
export function formatDateTime(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(d)) {
    throw new Error(`Invalid date: ${date}`);
  }
  return format(d, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
}

/**
 * Parse a date string
 * @param {string} dateStr - The date string to parse
 * @param {string} formatStr - The format string (default: 'yyyy-MM-dd')
 * @returns {Date} Parsed date object
 */
export function parseDate(dateStr, formatStr = 'yyyy-MM-dd') {
  return parse(dateStr, formatStr, new Date());
}

/**
 * Get the start of day (00:00:00)
 * @param {Date|string} date - The date
 * @returns {Date} Start of day
 */
export function startOfDay(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Get the end of day (23:59:59)
 * @param {Date|string} date - The date
 * @returns {Date} End of day
 */
export function endOfDay(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Compare two dates (returns -1, 0, or 1)
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDate(date1, date2) {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}
