import readline from 'readline';
import chalk from 'chalk';
import { addWeeks } from 'date-fns';
import {
  getCurrentWeek,
  getWeekDateRange,
  getAllDatesInWeek,
  getWeekForDate
} from '../utils/weekCalculator.js';
import { getExistingWeeks } from '../storage/fileManager.js';
import { startDate } from '../config/repositories.js';

/**
 * Detect all missing weeks between startDate and current week
 * @param {string} outputDirectory - Directory where week files are stored
 * @returns {Promise<Array>} Array of missing week objects: { year, week, start, end }
 */
export async function detectMissingWeeks(outputDirectory) {
  const existingWeeks = await getExistingWeeks(outputDirectory);
  const existingWeekStrs = new Set(existingWeeks.map(w => w.weekStr));

  // Generate all weeks from project start to current week
  const currentWeek = getCurrentWeek();
  const allWeeks = generateWeekRange(startDate, currentWeek);

  // Filter to only missing weeks
  const missing = allWeeks.filter(week => !existingWeekStrs.has(week.weekStr));

  return missing;
}

/**
 * Generate all weeks in a date range
 * @param {string} startDateStr - Start date (YYYY-MM-DD)
 * @param {Object} endWeek - End week { year, week }
 * @returns {Array} Array of week objects: { year, week, weekStr, start, end }
 */
function generateWeekRange(startDateStr, endWeek) {
  const weeks = [];

  // Start with the ISO week containing the start date
  let currentDate = new Date(startDateStr);
  let currentWeekInfo = getWeekForDate(currentDate);

  // Generate weeks until we reach the end week
  while (
    currentWeekInfo.year < endWeek.year ||
    (currentWeekInfo.year === endWeek.year && currentWeekInfo.week <= endWeek.week)
  ) {
    const weekStr = `${currentWeekInfo.year}-${String(currentWeekInfo.week).padStart(2, '0')}`;
    const { start, end } = getWeekDateRange(currentWeekInfo.year, currentWeekInfo.week);

    weeks.push({
      year: currentWeekInfo.year,
      week: currentWeekInfo.week,
      weekStr,
      start,
      end
    });

    // Move to next week by adding 7 days and getting the new ISO week
    currentDate = addWeeks(currentDate, 1);
    currentWeekInfo = getWeekForDate(currentDate);
  }

  return weeks;
}

/**
 * Display missing weeks in a formatted list
 * @param {Array} missingWeeks - Array of missing week objects
 * @returns {string} Formatted display string
 */
export function displayMissingWeeks(missingWeeks) {
  if (missingWeeks.length === 0) {
    return chalk.green('✓ No missing weeks! All data is up to date.');
  }

  let output = chalk.bold.cyan('Missing Weeks:\n');

  missingWeeks.forEach((week, index) => {
    const number = index + 1;
    const weekDisplay = chalk.cyan(`${week.weekStr}`);
    const dateDisplay = chalk.dim(`(${week.start} to ${week.end})`);
    output += `  [${number}] ${weekDisplay} ${dateDisplay}\n`;
  });

  return output;
}

/**
 * Prompt user to select which weeks to backfill
 * @param {Array} missingWeeks - Array of missing week objects
 * @returns {Promise<Array>} Array of selected week objects
 */
export async function promptUserSelection(missingWeeks) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const prompt = chalk.bold.cyan('Select weeks (comma-separated numbers, "all", or "q" to quit): ');

    rl.question(prompt, (answer) => {
      rl.close();

      const normalized = answer.trim().toLowerCase();

      // Handle quit
      if (normalized === 'q' || normalized === 'quit') {
        console.log(chalk.yellow('✗ Backfill cancelled'));
        process.exit(0);
      }

      // Handle "all"
      if (normalized === 'all') {
        resolve(missingWeeks);
        return;
      }

      // Parse comma-separated numbers
      const indices = normalized
        .split(',')
        .map(s => parseInt(s.trim(), 10) - 1) // Convert to 0-indexed
        .filter(i => !isNaN(i) && i >= 0 && i < missingWeeks.length);

      if (indices.length === 0) {
        console.log(chalk.red('✗ Invalid selection'));
        // Recurse to ask again
        resolve(promptUserSelection(missingWeeks));
        return;
      }

      const selected = indices.map(i => missingWeeks[i]);
      resolve(selected);
    });
  });
}

/**
 * Show confirmation prompt before starting backfill
 * @param {Array} selectedWeeks - Array of selected week objects
 * @returns {Promise<boolean>} true if user confirms, false otherwise
 */
export async function confirmBackfill(selectedWeeks) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    let confirmText = chalk.bold.cyan(`\nBackfill ${selectedWeeks.length} week(s):\n`);
    selectedWeeks.forEach(week => {
      confirmText += chalk.dim(`  • ${week.weekStr} (${week.start} to ${week.end})\n`);
    });
    confirmText += chalk.bold.cyan('This will make API calls to GitHub.\n');
    confirmText += chalk.bold.cyan('Continue? (Y/n): ');

    rl.question(confirmText, (answer) => {
      rl.close();

      const response = answer.trim().toLowerCase();
      const confirmed = response === '' || response === 'y' || response === 'yes';

      if (!confirmed) {
        console.log(chalk.yellow('✗ Backfill cancelled'));
      }

      resolve(confirmed);
    });
  });
}

/**
 * Process backfill: sequentially fetch and save data for selected weeks
 * @param {Array} selectedWeeks - Array of { year, week } objects to backfill
 * @param {Function} fetchFunction - Function to call for each week: async (year, week, force) => void
 * @returns {Promise<Object>} Results object: { successful: number, failed: number, errors: [] }
 */
export async function processBackfill(selectedWeeks, fetchFunction) {
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };

  console.log(chalk.bold.cyan(`\n📊 Backfilling ${selectedWeeks.length} weeks...\n`));

  for (let i = 0; i < selectedWeeks.length; i++) {
    const week = selectedWeeks[i];
    const progressStr = chalk.dim(`[${i + 1}/${selectedWeeks.length}]`);

    try {
      console.log(progressStr + ' ' + chalk.cyan(`Fetching ${week.weekStr}...`));
      await fetchFunction(week.year, week.week, false);
      results.successful++;
    } catch (error) {
      console.log(progressStr + ' ' + chalk.red(`✗ Failed to fetch ${week.weekStr}: ${error.message}`));
      results.failed++;
      results.errors.push({
        week: week.weekStr,
        error: error.message
      });
    }

    // Small delay between requests to be nice to GitHub API
    if (i < selectedWeeks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Show summary
  console.log(chalk.bold.cyan('\n📈 Backfill Summary\n'));
  console.log(`  Successful: ${chalk.green(results.successful)}`);
  console.log(`  Failed: ${chalk.red(results.failed)}`);

  if (results.errors.length > 0) {
    console.log(chalk.bold.yellow('\nErrors:'));
    results.errors.forEach(err => {
      console.log(chalk.dim(`  • ${err.week}: ${err.error}`));
    });
  }

  return results;
}

/**
 * Main backfill orchestrator
 * @param {string} outputDirectory - Directory where week files are stored
 * @param {Function} fetchFunction - Function to call for each week
 */
export async function runBackfill(outputDirectory, fetchFunction) {
  console.log(chalk.bold.cyan('🔄 Backfill Mode\n'));

  // Detect missing weeks
  const missingWeeks = await detectMissingWeeks(outputDirectory);

  if (missingWeeks.length === 0) {
    console.log(chalk.green('✓ No missing weeks! All data is up to date.\n'));
    return;
  }

  // Display missing weeks
  console.log(displayMissingWeeks(missingWeeks));
  console.log();

  // Prompt user to select weeks
  const selectedWeeks = await promptUserSelection(missingWeeks);

  if (selectedWeeks.length === 0) {
    console.log(chalk.yellow('✗ No weeks selected'));
    return;
  }

  // Confirm before proceeding
  const confirmed = await confirmBackfill(selectedWeeks);

  if (!confirmed) {
    return;
  }

  // Process backfill
  await processBackfill(selectedWeeks, fetchFunction);
}
