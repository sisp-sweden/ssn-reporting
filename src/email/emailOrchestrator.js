import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { loadWeekData, getPreviousWeek } from '../storage/fileManager.js';
import { compareWeeks } from '../reports/weekComparator.js';
import { getWeekDateRange, formatWeekString } from '../utils/weekCalculator.js';
import { generateEmailHTML, generateEmailText } from './emailTemplates.js';
import { sendWeeklyEmail } from './emailSender.js';

/**
 * Main orchestrator: load data, build email, send it
 * @param {string} outputDirectory - Path to github-data directory
 * @param {Object} weekSpec - { year, week } for the target week
 * @param {Object} emailConfig - { apiKey, from, to }
 * @param {boolean} dryRun - If true, generate and save files but don't send email
 * @returns {Promise<Object>} Resend API response or { saved: true } for dry run
 */
export async function sendWeeklyEmailReport(outputDirectory, weekSpec, emailConfig, dryRun = false) {
  const { year, week } = weekSpec;
  const weekStr = formatWeekString(year, week);
  const dateRange = getWeekDateRange(year, week);

  console.log(chalk.cyan(`Loading data for week ${weekStr}...`));

  // Load current week data
  const currentData = await loadWeekData(outputDirectory, year, week);
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

  // Compare weeks
  const comparison = compareWeeks(currentData, previousData);

  // Build email data
  const emailData = {
    weekStr,
    dateRange,
    comparison,
    hasPreviousWeek: !!previousData
  };

  // Generate email content
  console.log(chalk.dim('Generating email content...'));
  const htmlContent = generateEmailHTML(emailData);
  const textContent = generateEmailText(emailData);
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
