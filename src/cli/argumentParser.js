import { Command } from 'commander';
import { getCurrentWeek, getWeekDateRange, getWeekForDate, formatWeekString } from '../utils/weekCalculator.js';
import chalk from 'chalk';

/**
 * Parse and validate command-line arguments
 * @returns {Object} Parsed arguments object
 */
export function parseArguments() {
  const program = new Command();

  program
    .version('1.0.0')
    .description('SSN GitHub Data Collector - Fetch and report on team GitHub activity')
    .option(
      '--week <value>',
      'Specify which week to fetch: current, last, YYYY-WW format, or any date (YYYY-MM-DD)',
      'current'
    )
    .option(
      '--backfill',
      'Enter interactive mode to select and fill missing weeks'
    )
    .option(
      '--force',
      'Force re-fetch data even if week already has complete data'
    )
    .option(
      '--generate-dashboard',
      'Generate HTML dashboard from existing week data'
    )
    .option(
      '--kanban-snapshot',
      'Capture kanban board snapshot for specified date'
    )
    .option(
      '--date <YYYY-MM-DD>',
      'Specify date for kanban snapshot (default: today)'
    )
    .option(
      '--generate-kanban-dashboard',
      'Generate kanban dashboard HTML from existing snapshots'
    )
    .option(
      '--open-prs',
      'Fetch open PRs from all repositories and generate dashboard'
    )
    .option(
      '--send-email',
      'Send weekly email report for the specified week'
    )
    .option(
      '--dry-run',
      'Generate and save email report without sending (for testing)'
    )
    .parse(process.argv);

  const options = program.opts();

  // Get today's date for default
  const today = new Date().toISOString().split('T')[0];

  // Validate and convert week argument
  const weekSpec = validateAndParseWeek(options.week);

  return {
    week: weekSpec,
    backfill: options.backfill || false,
    force: options.force || false,
    generateDashboard: options.generateDashboard || false,
    kanbanSnapshot: options.kanbanSnapshot || false,
    date: options.date || today,
    generateKanbanDashboard: options.generateKanbanDashboard || false,
    openPrs: options.openPrs || false,
    sendEmail: options.sendEmail || false,
    dryRun: options.dryRun || false
  };
}

/**
 * Validate and parse the week specification into { year, week }
 * Supports: 'current', 'last', 'YYYY-WW', or 'YYYY-MM-DD'
 * @param {string} weekSpec - Week specification
 * @returns {Object} { year, week } object
 * @throws {Error} If week format is invalid
 */
function validateAndParseWeek(weekSpec) {
  // Handle 'current' keyword
  if (weekSpec.toLowerCase() === 'current') {
    const current = getCurrentWeek();
    return {
      year: current.year,
      week: current.week,
      format: 'current'
    };
  }

  // Handle 'last' keyword
  if (weekSpec.toLowerCase() === 'last') {
    const current = getCurrentWeek();
    let lastWeek = current.week - 1;
    let lastYear = current.year;

    if (lastWeek < 1) {
      lastWeek = 53; // or 52, depending on the year
      lastYear -= 1;
    }

    return {
      year: lastYear,
      week: lastWeek,
      format: 'last'
    };
  }

  // Handle ISO week format (YYYY-WW)
  const isoMatch = weekSpec.match(/^(\d{4})-(\d{2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const week = parseInt(isoMatch[2], 10);

    if (week < 1 || week > 53) {
      throw new Error(
        chalk.red(`Invalid week number: ${week}. Week must be between 1 and 53.`)
      );
    }

    return {
      year,
      week,
      format: 'iso'
    };
  }

  // Handle date format (YYYY-MM-DD)
  const dateMatch = weekSpec.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    const day = parseInt(dateMatch[3], 10);

    // Basic validation
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error(
        chalk.red(`Invalid date: ${weekSpec}. Use format YYYY-MM-DD.`)
      );
    }

    const date = new Date(year, month - 1, day);
    const weekInfo = getWeekForDate(date);

    if (!weekInfo) {
      throw new Error(
        chalk.red(`Could not determine week for date: ${weekSpec}`)
      );
    }

    return {
      year: weekInfo.year,
      week: weekInfo.week,
      format: 'date',
      originalDate: weekSpec
    };
  }

  // Invalid format
  throw new Error(
    chalk.red(
      `Invalid week format: ${weekSpec}\n\nSupported formats:\n` +
      '  - current (default)\n' +
      '  - last\n' +
      '  - YYYY-WW (e.g., 2025-52)\n' +
      '  - YYYY-MM-DD (e.g., 2025-12-23)'
    )
  );
}

/**
 * Format parsed week information for display
 * @param {Object} week - Week object with { year, week, format, ... }
 * @returns {string} Formatted week string (YYYY-WW)
 */
export function formatParsedWeek(week) {
  return formatWeekString(week.year, week.week);
}

/**
 * Get human-readable description of the week
 * @param {Object} week - Week object with { year, week, format, ... }
 * @returns {string} Description (e.g., "Week 2025-52 (Dec 23 - Dec 29)")
 */
export function describeWeek(week) {
  const weekStr = formatParsedWeek(week);
  const dateRange = getWeekDateRange(week.year, week.week);

  let description = `Week ${weekStr}`;

  if (week.format === 'current') {
    description += ' (current)';
  } else if (week.format === 'last') {
    description += ' (last week)';
  } else if (week.format === 'date') {
    description += ` (from date ${week.originalDate})`;
  }

  description += ` (${dateRange.start} to ${dateRange.end})`;

  return description;
}
