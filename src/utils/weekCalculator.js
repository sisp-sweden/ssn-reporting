import {
  getISOWeek,
  getISOWeekYear,
  startOfISOWeek,
  endOfISOWeek,
  format,
  addDays,
  isWithinInterval,
  eachDayOfInterval
} from 'date-fns';

/**
 * Get the current ISO week and year
 * @returns {Object} { year: number, week: number }
 */
export function getCurrentWeek() {
  const today = new Date();
  return {
    year: getISOWeekYear(today),
    week: getISOWeek(today)
  };
}

/**
 * Get the date range for a specific ISO week
 * @param {number} year - The year (e.g., 2025)
 * @param {number} week - The ISO week number (1-53)
 * @returns {Object} { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 */
export function getWeekDateRange(year, week) {
  // Create a date that falls within the target week
  // January 4th is always in week 1 of that year
  const jan4 = new Date(year, 0, 4);
  const weekStart = startOfISOWeek(jan4);

  // Calculate the actual start date by adding weeks
  const weeksToAdd = week - 1;
  const targetStart = addDays(weekStart, weeksToAdd * 7);
  const targetEnd = endOfISOWeek(targetStart);

  return {
    start: format(targetStart, 'yyyy-MM-dd'),
    end: format(targetEnd, 'yyyy-MM-dd')
  };
}

/**
 * Format week and year as a string
 * @param {number} year - The year
 * @param {number} week - The ISO week number
 * @returns {string} e.g., '2025-52'
 */
export function formatWeekString(year, week) {
  return `${year}-${String(week).padStart(2, '0')}`;
}

/**
 * Parse a week string back to year and week
 * @param {string} weekStr - e.g., '2025-52'
 * @returns {Object} { year: number, week: number }
 */
export function parseWeekString(weekStr) {
  const [year, week] = weekStr.split('-');
  return {
    year: parseInt(year, 10),
    week: parseInt(week, 10)
  };
}

/**
 * Get the ISO week for a specific date
 * @param {Date|string} date - The date to check
 * @returns {Object} { year: number, week: number }
 */
export function getWeekForDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return {
    year: getISOWeekYear(d),
    week: getISOWeek(d)
  };
}

/**
 * Get all dates in a specific ISO week
 * @param {number} year - The year
 * @param {number} week - The ISO week number
 * @returns {string[]} Array of date strings in 'YYYY-MM-DD' format
 */
export function getAllDatesInWeek(year, week) {
  const { start, end } = getWeekDateRange(year, week);
  const startDate = new Date(start);
  const endDate = new Date(end);

  const dates = eachDayOfInterval({ start: startDate, end: endDate });
  return dates.map(d => format(d, 'yyyy-MM-dd'));
}

/**
 * Get date range as Date objects (not strings)
 * @param {number} year - The year
 * @param {number} week - The ISO week number
 * @returns {Object} { start: Date, end: Date }
 */
export function getWeekDateRangeAsObjects(year, week) {
  const { start, end } = getWeekDateRange(year, week);
  return {
    start: new Date(start),
    end: new Date(end)
  };
}

/**
 * Check if a date falls within a specific week
 * @param {string|Date} date - The date to check
 * @param {number} year - The year
 * @param {number} week - The ISO week number
 * @returns {boolean}
 */
export function isDateInWeek(date, year, week) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const { start, end } = getWeekDateRangeAsObjects(year, week);
  return isWithinInterval(d, { start, end });
}
