import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { loadWeekData, getPreviousWeek, getExistingWeeks, loadMultipleWeeks } from '../storage/fileManager.js';
import { loadEnrichedWeekData } from '../storage/enrichedDataManager.js';
import { compareWeeks, compareMultipleWeeks } from '../reports/weekComparator.js';
import { getWeekDateRange, formatWeekString } from '../utils/weekCalculator.js';
import { generateEnhancedEmailHTML, generateEnhancedEmailText } from './emailTemplatesEnhanced.js';
import { sendWeeklyEmail } from './emailSender.js';

/**
 * Send weekly email report using enriched data with multi-week trends
 * @param {string} outputDirectory - Path to github-data directory
 * @param {Object} weekSpec - { year, week } for the target week
 * @param {Object} emailConfig - { apiKey, from, to }
 * @param {boolean} dryRun - If true, generate and save files but don't send email
 * @returns {Promise<Object>} Resend API response or { saved: true } for dry run
 */
export async function sendEnhancedWeeklyEmailReport(outputDirectory, weekSpec, emailConfig, dryRun = false) {
  const { year, week } = weekSpec;
  const weekStr = formatWeekString(year, week);
  const dateRange = getWeekDateRange(year, week);

  console.log(chalk.cyan(`Loading data for week ${weekStr}...`));

  // Try to load enriched data first
  let enrichedData = await loadEnrichedWeekData(year, week);

  // Fall back to basic data if enriched data is not available
  const currentData = enrichedData?.metrics?.users
    ? { ...enrichedData, users: enrichedData.metrics.users }
    : await loadWeekData(outputDirectory, year, week);

  if (!currentData) {
    throw new Error(`No data found for week ${weekStr}. Run data collection first.`);
  }

  // Load previous week data for comparison
  const prev = getPreviousWeek(year, week);
  const previousData = await loadWeekData(outputDirectory, prev.year, prev.week);

  if (previousData) {
    console.log(chalk.dim(`Loaded previous week ${formatWeekString(prev.year, prev.week)} for comparison`));
  } else {
    console.log(chalk.dim('No previous week data available for comparison'));
  }

  // Compare weeks (current vs previous for trend arrows)
  const comparison = compareWeeks(currentData, previousData);

  // Load up to 8 most recent weeks for trend charts
  console.log(chalk.dim('Loading multi-week data for trend charts...'));
  const existingWeeks = await getExistingWeeks(outputDirectory);

  // Find weeks up to and including the current week
  const currentWeekStr = weekStr;
  const relevantWeeks = existingWeeks.filter(w => w.weekStr <= currentWeekStr);
  const recentWeeks = relevantWeeks.slice(-8); // Last 8 weeks

  const multiWeekMap = await loadMultipleWeeks(outputDirectory, recentWeeks);
  const multiWeekArray = recentWeeks
    .map(w => multiWeekMap[w.weekStr])
    .filter(Boolean);

  const multiWeekData = compareMultipleWeeks(multiWeekArray);
  console.log(chalk.dim(`  Loaded ${multiWeekArray.length} weeks for trend charts`));

  // Build email data with enriched data and multi-week trends
  const emailData = {
    weekStr,
    dateRange,
    comparison,
    hasPreviousWeek: !!previousData,
    enrichedData,
    multiWeekData,
    repositoriesData: multiWeekData.repositories || {}
  };

  // Generate email content
  console.log(chalk.dim('Generating enhanced email content...'));
  const htmlContent = generateEnhancedEmailHTML(emailData);
  const textContent = generateEnhancedEmailText(emailData);
  const subject = `SSN Weekly Report - Week ${weekStr}`;

  // Save to reports/weekly_email directory
  const reportsDir = path.join(process.cwd(), 'reports', 'weekly_email');
  await fs.mkdir(reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const htmlPath = path.join(reportsDir, `${weekStr}_${timestamp}.html`);
  const textPath = path.join(reportsDir, `${weekStr}_${timestamp}.txt`);

  await fs.writeFile(htmlPath, htmlContent, 'utf-8');
  await fs.writeFile(textPath, textContent, 'utf-8');

  console.log(chalk.green(`✓ Saved HTML report to ${htmlPath}`));
  console.log(chalk.green(`✓ Saved text report to ${textPath}`));

  // Send email (unless dry run)
  if (dryRun) {
    console.log(chalk.yellow('\n⚠️  Dry run mode - email not sent'));
    return { saved: true, htmlPath, textPath };
  }

  console.log(chalk.cyan(`\nSending email to ${emailConfig.to}...`));
  const result = await sendWeeklyEmail(htmlContent, textContent, subject, emailConfig);

  console.log(chalk.green(`✓ Email sent successfully (ID: ${result.id})`));

  return result;
}
