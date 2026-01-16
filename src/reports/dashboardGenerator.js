import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import { getExistingWeeks, loadMultipleWeeks, getPreviousWeek } from '../storage/fileManager.js';
import { compareWeeks } from './weekComparator.js';
import { generateDashboard } from './htmlTemplates.js';

/**
 * Main dashboard generation orchestrator
 * @param {string} outputDirectory - Directory where week files are stored
 * @param {string} dashboardOutputPath - Where to save the HTML dashboard
 */
export async function generateDashboardHTML(outputDirectory, dashboardOutputPath) {
  try {
    console.log(chalk.bold.cyan('\n📊 Generating Dashboard\n'));

    // Load all week data
    console.log(chalk.dim('Loading week data...'));
    const weeks = await getExistingWeeks(outputDirectory);

    if (weeks.length === 0) {
      console.log(chalk.yellow('No week data found. Run data collection first.'));
      return;
    }

    // Load all week files
    const weekList = weeks.map(w => ({ year: w.year, week: w.week }));
    const weekDataMap = await loadMultipleWeeks(outputDirectory, weekList);
    const weekDataArray = weeks
      .map(w => weekDataMap[w.weekStr])
      .filter(data => data !== undefined);

    console.log(chalk.dim(`Loaded ${weekDataArray.length} weeks of data\n`));

    // Calculate team-level statistics
    console.log(chalk.dim('Calculating team statistics...'));
    const teamStats = calculateTeamStats(weekDataArray);

    // Build leaderboards
    console.log(chalk.dim('Building leaderboards...'));
    const leaderboards = buildLeaderboards(weekDataArray);

    // Calculate trends and comparisons
    console.log(chalk.dim('Calculating trends...'));
    const { trends, comparisons } = calculateTrends(weekDataArray);

    // Generate dashboard data
    const generatedAt = new Date().toISOString();
    const dateRange = {
      start: weekDataArray[0]?.weekStart || 'Unknown',
      end: weekDataArray[weekDataArray.length - 1]?.weekEnd || 'Unknown',
      weeks: weekDataArray.length
    };

    const dashboardData = {
      generatedAt,
      dateRange,
      teamStats,
      leaderboards,
      trends,
      comparisons,
      weeks: weekDataArray
    };

    // Generate HTML
    console.log(chalk.dim('Generating HTML...'));
    const html = generateDashboard(dashboardData);

    // Write to file
    const dashboardDir = path.dirname(dashboardOutputPath);
    await fs.mkdir(dashboardDir, { recursive: true });
    await fs.writeFile(dashboardOutputPath, html, 'utf-8');

    console.log(chalk.green(`✓ Dashboard generated: ${dashboardOutputPath}\n`));
  } catch (error) {
    console.error(chalk.red('Error generating dashboard:'), error.message);
    throw error;
  }
}

/**
 * Calculate team-level statistics across all weeks
 * @param {Array} weekDataArray - Array of week data objects
 * @returns {Object} Team statistics
 */
function calculateTeamStats(weekDataArray) {
  let totalCommits = 0;
  let totalPRs = 0;
  let totalLinesAdded = 0;
  let totalLinesDeleted = 0;
  const allUsers = new Set();

  for (const weekData of weekDataArray) {
    for (const username in weekData.users || {}) {
      allUsers.add(username);
      const user = weekData.users[username];
      totalCommits += user.weekly?.commits || 0;
      totalPRs += user.weekly?.prs || 0;
      totalLinesAdded += user.weekly?.linesAdded || 0;
      totalLinesDeleted += user.weekly?.linesDeleted || 0;
    }
  }

  return {
    totalCommits,
    totalPRs,
    totalLinesAdded,
    totalLinesDeleted,
    activeUsers: allUsers.size
  };
}

/**
 * Build leaderboards from week data
 * @param {Array} weekDataArray - Array of week data objects
 * @returns {Object} Leaderboards: { byCommits, byPRs, byLinesChanged }
 */
function buildLeaderboards(weekDataArray) {
  const userStats = {};

  // Aggregate user statistics across all weeks
  for (const weekData of weekDataArray) {
    for (const username in weekData.users || {}) {
      if (!userStats[username]) {
        userStats[username] = {
          commits: 0,
          prs: 0,
          linesAdded: 0,
          linesDeleted: 0
        };
      }

      const user = weekData.users[username];
      userStats[username].commits += user.weekly?.commits || 0;
      userStats[username].prs += user.weekly?.prs || 0;
      userStats[username].linesAdded += user.weekly?.linesAdded || 0;
      userStats[username].linesDeleted += user.weekly?.linesDeleted || 0;
    }
  }

  // Build leaderboards
  const byCommits = Object.entries(userStats)
    .map(([username, stats]) => ({ username, value: stats.commits }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const byPRs = Object.entries(userStats)
    .map(([username, stats]) => ({ username, value: stats.prs }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const byLinesAdded = Object.entries(userStats)
    .map(([username, stats]) => ({ username, value: stats.linesAdded }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const byLinesDeleted = Object.entries(userStats)
    .map(([username, stats]) => ({ username, value: stats.linesDeleted }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const byLinesChanged = Object.entries(userStats)
    .map(([username, stats]) => ({ username, value: stats.linesAdded + stats.linesDeleted }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return {
    byCommits,
    byPRs,
    byLinesAdded,
    byLinesDeleted,
    byLinesChanged
  };
}

/**
 * Calculate trends and comparisons between consecutive weeks
 * @param {Array} weekDataArray - Array of week data objects (sorted chronologically)
 * @returns {Object} { trends, comparisons }
 */
function calculateTrends(weekDataArray) {
  const comparisons = [];

  // Calculate comparison for each week with its previous week
  for (let i = 0; i < weekDataArray.length; i++) {
    const currentWeek = weekDataArray[i];
    const previousWeek = i > 0 ? weekDataArray[i - 1] : null;

    const comparison = compareWeeks(currentWeek, previousWeek);
    comparisons.push(comparison);
  }

  // Trends is the last comparison (most recent week)
  const trends = comparisons[comparisons.length - 1] || null;

  return {
    trends: trends ? { ...trends.comparisons } : null,
    comparisons
  };
}

/**
 * Quick dashboard generation with sensible defaults
 * Useful for calling after data fetch completes
 * @param {string} outputDirectory - Directory where week files are stored
 */
export async function generateDashboardQuick(outputDirectory) {
  const dashboardPath = path.join(outputDirectory, '..', 'dashboard.html');
  await generateDashboardHTML(outputDirectory, dashboardPath);
}
