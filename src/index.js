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
  addMetricsToRepository,
  mergeWithExisting,
  getMissingDates,
  getWeekStatistics,
  calculateWeeklyTotals
} from './storage/dataAggregator.js';
import {
  loadWeekData,
  saveWeekData,
  weekFileExists,
  listWeekFiles,
  getPreviousWeek
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
import { sendWeeklyEmailReport } from './email/emailOrchestrator.js';
import { sendEnhancedWeeklyEmailReport } from './email/emailOrchestratorEnhanced.js';
import { getEmailConfig } from './config/emailConfig.js';
import { fetchReviewDataForPRs, countReviewsByUserAndDate, countReviewCommentsByUserAndDate, countDiscussionCommentsByUserAndDate } from './github/reviews.js';
import { addReviewToData, addReviewCommentsToData, addDiscussionCommentsToData } from './storage/dataAggregator.js';
import { saveEnrichedWeekData, buildEnrichedData } from './storage/enrichedDataManager.js';
import { runAIAnalysis } from './ai/analysisWorkflow.js';
import { runDailySummary } from './dailySummary.js';
import path from 'path';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL_CONFIG = {
  extraction: process.env.OPENAI_MODEL_EXTRACTION || 'gpt-4o-mini',
  analysis: process.env.OPENAI_MODEL_ANALYSIS || 'gpt-4o'
};

/**
 * Main CLI orchestrator - parses arguments and routes to appropriate workflow
 */
async function runCLI() {
  try {
    // Parse command-line arguments first (before token check)
    const args = parseArguments();

    console.log(chalk.bold.cyan('\n🔍 SSN GitHub Data Collector\n'));

    // Daily standup route
    if (args.dailyStandup) {
      if (!GITHUB_TOKEN) {
        console.error(chalk.red('❌ Error: GITHUB_TOKEN not found in .env file'));
        process.exit(1);
      }
      const githubUsername = process.env.GITHUB_USERNAME;
      if (!githubUsername) {
        console.error(chalk.red('❌ Error: GITHUB_USERNAME not found in .env file'));
        process.exit(1);
      }
      await runDailySummary(args.date, GITHUB_TOKEN, githubUsername, true);
      return;
    }

    // Send email route (doesn't need GITHUB_TOKEN)
    if (args.sendEmail) {
      const emailConfig = getEmailConfig();
      console.log(chalk.bold.cyan('📧 Sending Weekly Email Report\n'));
      // Use enhanced email with AI insights
      await sendEnhancedWeeklyEmailReport(outputDirectory, args.week, emailConfig, args.dryRun);
      console.log(chalk.green('\n✓ Complete!\n'));
      return;
    }

    // Validate GitHub token for all other routes
    if (!GITHUB_TOKEN) {
      console.error(
        chalk.red('❌ Error: GITHUB_TOKEN not found in .env file')
      );
      process.exit(1);
    }

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

    // Fetch review data for all PRs
    console.log(chalk.bold('Review Data:'));
    let allReviewData = { reviews: [], reviewComments: [], discussionComments: [] };

    for (const repository of repositories) {
      const { owner, repo } = repository;
      const repoPRs = prs.filter(pr => pr.repository === `${owner}/${repo}`);

      if (repoPRs.length > 0) {
        const reviewData = await fetchReviewDataForPRs(client, owner, repo, repoPRs);
        allReviewData.reviews.push(...reviewData.reviews);
        allReviewData.reviewComments.push(...reviewData.reviewComments);
        allReviewData.discussionComments.push(...reviewData.discussionComments);
      }
    }
    console.log();

    // Aggregate data
    console.log(chalk.dim('Aggregating data by user and date...\n'));

    // Create or load data structure
    let weekData = existingData ||
      createEmptyWeekStructure(year, week);

    if (!existingData) {
      weekData.repositories = repositories.map(r => `${r.owner}/${r.repo}`);
    }

    // Add commits to data (track repo metrics while aggregating)
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
    // Track per-repo commit metrics
    for (const commit of commits) {
      const commitDate = new Date(commit.date).toISOString().split('T')[0];
      addMetricsToRepository(weekData, commit.repository, {
        commits: 1,
        linesAdded: commit.additions,
        linesDeleted: commit.deletions
      });
    }

    // Add PRs to data (track repo metrics while aggregating)
    const prStats = countPRsByUserAndDate(prs);
    for (const [username, dateStats] of Object.entries(prStats)) {
      for (const [date, prCount] of Object.entries(dateStats)) {
        for (let i = 0; i < prCount; i++) {
          addPRToData(weekData, username, date);
        }
      }
    }
    // Track per-repo PR metrics
    for (const pr of prs) {
      const prDate = new Date(pr.createdAt).toISOString().split('T')[0];
      addMetricsToRepository(weekData, pr.repository, { prs: 1 });
    }

    // Add review data
    const reviewStats = countReviewsByUserAndDate(allReviewData.reviews);
    for (const [username, dateStats] of Object.entries(reviewStats)) {
      for (const [date, count] of Object.entries(dateStats)) {
        addReviewToData(weekData, username, date, count);
      }
    }

    const reviewCommentStats = countReviewCommentsByUserAndDate(allReviewData.reviewComments);
    for (const [username, dateStats] of Object.entries(reviewCommentStats)) {
      for (const [date, count] of Object.entries(dateStats)) {
        addReviewCommentsToData(weekData, username, date, count);
      }
    }

    const discussionCommentStats = countDiscussionCommentsByUserAndDate(allReviewData.discussionComments);
    for (const [username, dateStats] of Object.entries(discussionCommentStats)) {
      for (const [date, count] of Object.entries(dateStats)) {
        addDiscussionCommentsToData(weekData, username, date, count);
      }
    }

    // Track per-repo review metrics
    for (const review of allReviewData.reviews) {
      const reviewDate = new Date(review.submittedAt).toISOString().split('T')[0];
      addMetricsToRepository(weekData, review.repository, { reviewsGiven: 1 });
    }

    // Track per-repo review comment metrics
    for (const comment of allReviewData.reviewComments) {
      const commentDate = new Date(comment.createdAt).toISOString().split('T')[0];
      addMetricsToRepository(weekData, comment.repository, { reviewCommentsGiven: 1 });
    }

    // Track per-repo discussion comment metrics
    for (const comment of allReviewData.discussionComments) {
      const commentDate = new Date(comment.createdAt).toISOString().split('T')[0];
      addMetricsToRepository(weekData, comment.repository, { discussionCommentsGiven: 1 });
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

      // Add review data to newData
      const reviewStats = countReviewsByUserAndDate(allReviewData.reviews);
      for (const [username, dateStats] of Object.entries(reviewStats)) {
        for (const [date, count] of Object.entries(dateStats)) {
          addReviewToData(newData, username, date, count);
        }
      }

      const reviewCommentStats = countReviewCommentsByUserAndDate(allReviewData.reviewComments);
      for (const [username, dateStats] of Object.entries(reviewCommentStats)) {
        for (const [date, count] of Object.entries(dateStats)) {
          addReviewCommentsToData(newData, username, date, count);
        }
      }

      const discussionCommentStats = countDiscussionCommentsByUserAndDate(allReviewData.discussionComments);
      for (const [username, dateStats] of Object.entries(discussionCommentStats)) {
        for (const [date, count] of Object.entries(dateStats)) {
          addDiscussionCommentsToData(newData, username, date, count);
        }
      }

      weekData = mergeWithExisting(existingData, newData);
    } else {
      calculateWeeklyTotals(weekData);
    }

    // Save basic data to github-data
    console.log(chalk.bold.cyan('\n💾 Saving data...\n'));
    await saveWeekData(outputDirectory, year, week, weekData);

    // Run AI analysis automatically
    const previousWeekData = await loadWeekData(
      outputDirectory,
      getPreviousWeek(year, week).year,
      getPreviousWeek(year, week).week
    );

    const aiAnalysis = await runAIAnalysis(
      weekData,
      previousWeekData,
      allReviewData,
      prs,
      OPENAI_API_KEY,
      OPENAI_MODEL_CONFIG
    );

    // Build and save enriched data to /data directory
    const enrichedData = buildEnrichedData(weekData, allReviewData, aiAnalysis);
    await saveEnrichedWeekData(year, week, enrichedData);

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
