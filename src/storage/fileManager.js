import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

/**
 * File manager for GitHub data JSON files
 */

/**
 * Get the output path for a week data file
 * @param {string} outputDirectory - Base output directory
 * @param {number} year - The year
 * @param {number} week - The ISO week number
 * @returns {string} Full file path
 */
export function getOutputPath(outputDirectory, year, week) {
  const weekStr = String(week).padStart(2, '0');
  const filename = `${year}-${weekStr}.json`;
  return path.join(outputDirectory, filename);
}

/**
 * Ensure the output directory exists
 * @param {string} outputDirectory - Directory path
 * @returns {Promise<void>}
 */
export async function ensureDirectoryExists(outputDirectory) {
  try {
    await fs.mkdir(outputDirectory, { recursive: true });
  } catch (error) {
    console.error(
      chalk.red('Error creating output directory:'),
      error.message
    );
    throw error;
  }
}

/**
 * Check if a week data file exists
 * @param {string} outputDirectory - Base output directory
 * @param {number} year - The year
 * @param {number} week - The ISO week number
 * @returns {Promise<boolean>}
 */
export async function weekFileExists(outputDirectory, year, week) {
  const filePath = getOutputPath(outputDirectory, year, week);

  try {
    await fs.stat(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Load week data from JSON file
 * @param {string} outputDirectory - Base output directory
 * @param {number} year - The year
 * @param {number} week - The ISO week number
 * @returns {Promise<Object|null>} Parsed JSON data or null if file doesn't exist
 */
export async function loadWeekData(outputDirectory, year, week) {
  const filePath = getOutputPath(outputDirectory, year, week);

  try {
    const fileExists = await weekFileExists(outputDirectory, year, week);
    if (!fileExists) {
      return null;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    console.error(chalk.red('Error reading week data file:'), error.message);
    throw error;
  }
}

/**
 * Save week data to JSON file
 * @param {string} outputDirectory - Base output directory
 * @param {number} year - The year
 * @param {number} week - The ISO week number
 * @param {Object} data - Data to save
 * @returns {Promise<void>}
 */
export async function saveWeekData(outputDirectory, year, week, data) {
  const filePath = getOutputPath(outputDirectory, year, week);

  try {
    // Ensure directory exists
    await ensureDirectoryExists(outputDirectory);

    // Backup existing file if it exists
    const exists = await weekFileExists(outputDirectory, year, week);
    if (exists) {
      const backupPath = `${filePath}.backup`;
      try {
        await fs.copyFile(filePath, backupPath);
        console.log(chalk.dim(`Backed up existing file to ${backupPath}`));
      } catch (error) {
        console.warn(chalk.yellow('Could not create backup file'));
      }
    }

    // Write new file
    const jsonContent = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonContent, 'utf-8');

    console.log(chalk.green(`✓ Saved data to ${filePath}`));
  } catch (error) {
    console.error(chalk.red('Error saving week data file:'), error.message);
    throw error;
  }
}

/**
 * List all week data files in the directory
 * @param {string} outputDirectory - Base output directory
 * @returns {Promise<Array>} Array of { year, week, filename }
 */
export async function listWeekFiles(outputDirectory) {
  try {
    await ensureDirectoryExists(outputDirectory);

    const files = await fs.readdir(outputDirectory);
    const weekFiles = [];

    for (const file of files) {
      const match = file.match(/^(\d{4})-(\d{2})\.json$/);
      if (match) {
        weekFiles.push({
          year: parseInt(match[1], 10),
          week: parseInt(match[2], 10),
          filename: file
        });
      }
    }

    return weekFiles.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.week - b.week;
    });
  } catch (error) {
    console.error(chalk.red('Error listing week files:'), error.message);
    return [];
  }
}

/**
 * Delete a week data file
 * @param {string} outputDirectory - Base output directory
 * @param {number} year - The year
 * @param {number} week - The ISO week number
 * @returns {Promise<void>}
 */
export async function deleteWeekFile(outputDirectory, year, week) {
  const filePath = getOutputPath(outputDirectory, year, week);

  try {
    await fs.unlink(filePath);
    console.log(chalk.green(`✓ Deleted ${filePath}`));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(chalk.red('Error deleting week file:'), error.message);
      throw error;
    }
  }
}

/**
 * Get all existing weeks as a sorted list
 * @param {string} outputDirectory - Base output directory
 * @returns {Promise<Array>} Array of { year, week, weekStr } sorted chronologically
 */
export async function getExistingWeeks(outputDirectory) {
  const weeks = await listWeekFiles(outputDirectory);
  return weeks.map(w => ({
    year: w.year,
    week: w.week,
    weekStr: formatWeekString(w.year, w.week)
  }));
}

/**
 * Load multiple weeks of data at once
 * @param {string} outputDirectory - Base output directory
 * @param {Array} weekList - Array of { year, week } objects
 * @returns {Promise<Object>} Map of week strings to data objects
 */
export async function loadMultipleWeeks(outputDirectory, weekList) {
  const results = {};

  for (const { year, week } of weekList) {
    const weekStr = formatWeekString(year, week);
    try {
      const data = await loadWeekData(outputDirectory, year, week);
      if (data) {
        results[weekStr] = data;
      }
    } catch (error) {
      console.warn(
        chalk.yellow(`Warning: Could not load ${weekStr}: ${error.message}`)
      );
    }
  }

  return results;
}

/**
 * Get the previous week for a given year and week
 * @param {number} year - The year
 * @param {number} week - The ISO week number
 * @returns {Object} { year, week } for the previous week, or null if none exists
 */
export function getPreviousWeek(year, week) {
  if (week > 1) {
    return {
      year,
      week: week - 1
    };
  } else {
    // Previous week is from previous year (week 52 or 53)
    // Note: This assumes week 52 or 53 for previous year; for proper handling,
    // you might need to check if previous year's last week is 52 or 53
    return {
      year: year - 1,
      week: 52 // Could be 53 depending on the year
    };
  }
}

/**
 * Format week and year as a string
 * @param {number} year - The year
 * @param {number} week - The ISO week number
 * @returns {string} e.g., '2025-52'
 */
function formatWeekString(year, week) {
  return `${year}-${String(week).padStart(2, '0')}`;
}
