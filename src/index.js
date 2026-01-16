import dotenv from 'dotenv';
import chalk from 'chalk';
import { GitHubClient } from './github/client.js';
import {
  fetchCommitsForDateRange,
  aggregateCommitStats
} from './github/commits.js';
import {
  fetchPRsForDateRange,
  countPRsByUserAndDate
} from './github/pullRequests.js';
import {
  createEmptyWeekStructure,
  addCommitToData,
  addPRToData,
  mergeWithExisting,
  getMissingDates,
  getWeekStatistics,
  calculateWeeklyTotals
} from './storage/dataAggregator.js';
import {
  loadWeekData,
  saveWeekData,
  weekFileExists,
  listWeekFiles
} from './storage/fileManager.js';
import {
  getCurrentWeek,
  getWeekDateRange,
  getAllDatesInWeek,
  formatWeekString
} from './utils/weekCalculator.js';
import { repositories, startDate, outputDirectory, kanbanOutputDirectory } from './config/repositories.js';
import { parseArguments, describeWeek } from './cli/argumentParser.js';
import { runBackfill } from './cli/backfillManager.js';
import { generateDashboardHTML } from './reports/dashboardGenerator.js';
import { collectKanbanSnapshot } from './kanban/snapshotCollector.js';
import { generateKanbanDashboard } from './kanban/dashboardGenerator.js';
import { fetchAllOpenPRs } from './openPrs/openPrsCollector.js';
import { generateOpenPRsPage } from './openPrs/openPrsHtmlGenerator.js';
import path from 'path';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

/**
 * Main CLI orchestrator - parses arguments and routes to appropriate workflow
 */
async function runCLI() {
  try {
    // Validate GitHub token first
    if (!GITHUB_TOKEN) {
      console.error(
        chalk.red('❌ Error: GITHUB_TOKEN not found in .env file')
      );
      process.exit(1);
    }

    // Parse command-line arguments
    const args = parseArguments();

    console.log(chalk.bold.cyan('\n🔍 SSN GitHub Data Collector\n'));

    // Route based on arguments
    // Open PRs dashboard
    if (args.openPrs) {
      await runOpenPRsCollection();
    }
    // Kanban snapshot collection
    else if (args.kanbanSnapshot) {
      await collectKanbanSnapshot(args.date, GITHUB_TOKEN);

      // Optionally generate dashboard after snapshot
      if (args.generateKanbanDashboard) {
        await generateKanbanDashboard(kanbanOutputDirectory);
      }
    }
    // Kanban dashboard generation only
    else if (args.generateKanbanDashboard) {
      await generateKanbanDashboard(kanbanOutputDirectory);
    }
    // Check if generating dashboard only (without data fetch)
    else if (args.generateDashboard && !args.backfill &&
      process.argv.indexOf('--week') === -1) {
      // Generate dashboard only (no data fetch)
      const dashboardPath = path.join(process.cwd(), 'dashboard.html');
      await generateDashboardHTML(outputDirectory, dashboardPath);
    } else if (args.backfill) {
      // Interactive backfill mode
      await runBackfill(outputDirectory, fetchWeekData);
    } else {
      // Normal data fetch mode
      console.log(chalk.cyan(`Fetching data for ${describeWeek(args.week)}`));
      if (args.force) {
        console.log(chalk.yellow('Force refresh enabled - will re-fetch all data'));
      }
      console.log();

      // Fetch the week's data
      await fetchWeekData(args.week.year, args.week.week, args.force);

      // Optionally generate dashboard after fetch
      if (args.generateDashboard) {
        const dashboardPath = path.join(process.cwd(), 'dashboard.html');
        await generateDashboardHTML(outputDirectory, dashboardPath);
      }
    }

    console.log(chalk.green('\n✓ Complete!\n'));
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}

/**
 * Fetch GitHub data for a specific week and save it
 * @param {number} year - The year
 * @param {number} week - The ISO week number
 * @param {boolean} forceRefresh - If true, re-fetch even if data exists
 */
async function fetchWeekData(year, week, forceRefresh = false) {
  try {
    // Initialize GitHub client
    console.log(chalk.dim('Initializing GitHub API client...'));
    const client = new GitHubClient(GITHUB_TOKEN);

    // Get date range for this week
    const { start: weekStart, end: weekEnd } = getWeekDateRange(year, week);
    console.log(chalk.cyan(`Period: ${weekStart} to ${weekEnd}\n`));

    // Check for existing data (unless forcing refresh)
    const exists = await weekFileExists(outputDirectory, year, week);
    let existingData = null;
    let missingDates = getAllDatesInWeek(year, week);

    if (exists && !forceRefresh) {
      console.log(chalk.green('✓ Found existing data file'));
      existingData = await loadWeekData(outputDirectory, year, week);

      // Determine which dates are missing
      missingDates = getMissingDates(existingData, missingDates);

      if (missingDates.length === 0) {
        console.log(chalk.green('✓ All data already collected for this week\n'));
        console.log(chalk.dim(`Existing data summary:`));
        const stats = getWeekStatistics(existingData);
        displaySummary(stats);
        return;
      } else {
        console.log(
          chalk.yellow(
            `⚠️  Missing data for ${missingDates.length} days: ${missingDates.join(', ')}`
          )
        );
      }
    } else if (forceRefresh && exists) {
      console.log(chalk.yellow('Force refresh: re-fetching all data'));
    } else {
      console.log(chalk.dim('No existing data found, creating new file'));
    }

    // Fetch data from GitHub
    console.log(chalk.bold.cyan('\n📊 Fetching GitHub data...\n'));

    const since = missingDates[0];
    const until = missingDates[missingDates.length - 1];

    console.log(chalk.dim(`Fetching data from ${since} to ${until}\n`));

    // Fetch commits
    console.log(chalk.bold('Commits:'));
    const commits = await fetchCommitsForDateRange(
      client,
      repositories,
      since,
      until
    );
    console.log();

    // Fetch PRs
    console.log(chalk.bold('Pull Requests:'));
    const prs = await fetchPRsForDateRange(client, repositories, since);
    console.log();

    // Aggregate data
    console.log(chalk.dim('Aggregating data by user and date...\n'));

    // Create or load data structure
    let weekData = existingData ||
      createEmptyWeekStructure(year, week);

    if (!existingData) {
      weekData.repositories = repositories.map(r => `${r.owner}/${r.repo}`);
    }

    // Add commits to data
    const commitStats = aggregateCommitStats(commits);
    for (const [username, dateStats] of Object.entries(commitStats)) {
      for (const [date, stats] of Object.entries(dateStats)) {
        addCommitToData(
          weekData,
          username,
          date,
          stats.linesAdded,
          stats.linesDeleted
        );
      }
    }

    // Add PRs to data
    const prStats = countPRsByUserAndDate(prs);
    for (const [username, dateStats] of Object.entries(prStats)) {
      for (const [date, prCount] of Object.entries(dateStats)) {
        for (let i = 0; i < prCount; i++) {
          addPRToData(weekData, username, date);
        }
      }
    }

    // If we had existing data, merge properly
    if (existingData) {
      const newData = createEmptyWeekStructure(year, week);
      newData.repositories = repositories.map(r => `${r.owner}/${r.repo}`);

      const commitStats = aggregateCommitStats(commits);
      for (const [username, dateStats] of Object.entries(commitStats)) {
        for (const [date, stats] of Object.entries(dateStats)) {
          addCommitToData(
            newData,
            username,
            date,
            stats.linesAdded,
            stats.linesDeleted
          );
        }
      }

      const prStats = countPRsByUserAndDate(prs);
      for (const [username, dateStats] of Object.entries(prStats)) {
        for (const [date, prCount] of Object.entries(dateStats)) {
          for (let i = 0; i < prCount; i++) {
            addPRToData(newData, username, date);
          }
        }
      }

      weekData = mergeWithExisting(existingData, newData);
    } else {
      calculateWeeklyTotals(weekData);
    }

    // Save data
    console.log(chalk.bold.cyan('\n💾 Saving data...\n'));
    await saveWeekData(outputDirectory, year, week, weekData);

    // Display summary
    console.log(chalk.bold.cyan('\n📈 Summary\n'));
    const stats = getWeekStatistics(weekData);
    displaySummary(stats);

    // Display rate limit info
    const rateLimit = client.getLastRateLimit();
    if (rateLimit) {
      const remaining = rateLimit.resources.core.remaining;
      const limit = rateLimit.resources.core.limit;
      console.log(chalk.dim(`\nRate limit: ${remaining}/${limit} remaining`));
    }
  } catch (error) {
    console.error(chalk.red('❌ Error fetching week data:'), error.message);
    throw error;
  }
}

/**
 * Fetch open PRs and generate the dashboard
 */
async function runOpenPRsCollection() {
  try {
    console.log(chalk.bold.cyan('📋 Fetching Open Pull Requests\n'));

    // Initialize GitHub client
    const client = new GitHubClient(GITHUB_TOKEN);

    // Fetch all open PRs
    const openPRs = await fetchAllOpenPRs(client, repositories);

    // Generate HTML
    console.log(chalk.dim('Generating HTML dashboard...'));
    const html = generateOpenPRsPage(openPRs);

    // Save to file
    const outputPath = path.join(process.cwd(), 'open-prs.html');
    await fs.writeFile(outputPath, html, 'utf-8');

    console.log(chalk.green(`\n✓ Dashboard saved to: ${outputPath}`));

    // Display rate limit info
    const rateLimit = client.getLastRateLimit();
    if (rateLimit) {
      const remaining = rateLimit.resources.core.remaining;
      const limit = rateLimit.resources.core.limit;
      console.log(chalk.dim(`\nRate limit: ${remaining}/${limit} remaining`));
    }
  } catch (error) {
    console.error(chalk.red('❌ Error fetching open PRs:'), error.message);
    throw error;
  }
}

/**
 * Display summary statistics
 * @param {Object} stats - Statistics object
 */
function displaySummary(stats) {
  const formatNumber = (num) => num.toLocaleString();

  console.log(`  Commits:     ${chalk.cyan(formatNumber(stats.totalCommits))}`);
  console.log(`  PRs:         ${chalk.cyan(formatNumber(stats.totalPRs))}`);
  console.log(
    `  Lines added: ${chalk.green(formatNumber(stats.totalLinesAdded))}`
  );
  console.log(
    `  Lines deleted: ${chalk.red(formatNumber(stats.totalLinesDeleted))}`
  );
  console.log(`  Active users: ${chalk.magenta(stats.activeUsers)}`);

  if (stats.activeUsers > 0) {
    console.log(
      `  Avg commits/user: ${chalk.cyan(stats.averageCommitsPerUser)}`
    );
    console.log(`  Avg PRs/user: ${chalk.cyan(stats.averagePRsPerUser)}`);
  }
}

// Run CLI orchestrator
runCLI();
