import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { formatWeekString } from '../utils/weekCalculator.js';

/**
 * Save enriched week data to /data directory
 * @param {number} year - Year
 * @param {number} week - ISO week number
 * @param {Object} enrichedData - Complete enriched data object
 * @returns {Promise<string>} Path to saved file
 */
export async function saveEnrichedWeekData(year, week, enrichedData) {
  const weekStr = formatWeekString(year, week);
  const dataDir = path.join(process.cwd(), 'data');
  const filePath = path.join(dataDir, `${weekStr}.json`);

  // Ensure data directory exists
  await fs.mkdir(dataDir, { recursive: true });

  // Add metadata
  const dataToSave = {
    ...enrichedData,
    savedAt: new Date().toISOString(),
    version: '2.0' // Version 2.0 includes AI analysis
  };

  // Write to file
  await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');

  console.log(chalk.green(`✓ Saved enriched data to ${filePath}`));

  return filePath;
}

/**
 * Load enriched week data from /data directory
 * @param {number} year - Year
 * @param {number} week - ISO week number
 * @returns {Promise<Object|null>} Enriched data or null if not found
 */
export async function loadEnrichedWeekData(year, week) {
  const weekStr = formatWeekString(year, week);
  const dataDir = path.join(process.cwd(), 'data');
  const filePath = path.join(dataDir, `${weekStr}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist
    }
    throw error;
  }
}

/**
 * Build enriched data structure
 * @param {Object} weekData - Base week data from github-data
 * @param {Object} reviewData - Review activity data
 * @param {Object} aiAnalysis - AI analysis results
 * @returns {Object} Enriched data structure
 */
export function buildEnrichedData(weekData, reviewData, aiAnalysis) {
  return {
    week: weekData.week,
    weekStart: weekData.weekStart,
    weekEnd: weekData.weekEnd,
    generatedAt: weekData.generatedAt,
    repositories: weekData.repositories,

    // Core metrics (from github-data)
    metrics: {
      users: weekData.users
    },

    // Review activity
    reviewActivity: {
      reviews: reviewData.reviews,
      reviewComments: reviewData.reviewComments,
      discussionComments: reviewData.discussionComments,
      stats: {
        totalReviews: reviewData.reviews.length,
        totalReviewComments: reviewData.reviewComments.length,
        totalDiscussionComments: reviewData.discussionComments.length,
        uniqueReviewers: new Set(reviewData.reviews.map(r => r.reviewer)).size
      }
    },

    // AI Analysis
    aiAnalysis: {
      executiveSummary: aiAnalysis.executiveSummary || {},
      prQualityAnalysis: aiAnalysis.prQualityAnalysis || {},
      contributorAnalysis: aiAnalysis.contributorAnalysis || {},
      generatedAt: new Date().toISOString(),
      model: aiAnalysis.model || 'gpt-4o'
    }
  };
}

/**
 * Get all enriched data files
 * @returns {Promise<Array>} Array of week strings
 */
export async function getEnrichedDataFiles() {
  const dataDir = path.join(process.cwd(), 'data');

  try {
    const files = await fs.readdir(dataDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []; // Directory doesn't exist yet
    }
    throw error;
  }
}
