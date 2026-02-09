import { getAllDatesInWeek } from '../utils/weekCalculator.js';

/**
 * Create an empty week data structure
 * @param {number} year - The year
 * @param {number} week - The ISO week number
 * @param {Array} repos - Optional array of repository names
 * @returns {Object} Empty week data structure
 */
export function createEmptyWeekStructure(year, week, repos = []) {
  const weekStr = String(week).padStart(2, '0');
  const dates = getAllDatesInWeek(year, week);

  // Initialize repositoryMetrics for each repo
  const repositoryMetrics = {};
  for (const repo of repos) {
    repositoryMetrics[repo] = {
      commits: 0,
      prs: 0,
      linesAdded: 0,
      linesDeleted: 0,
      reviewsGiven: 0,
      reviewCommentsGiven: 0,
      discussionCommentsGiven: 0
    };
  }

  return {
    week: `${year}-${weekStr}`,
    weekStart: dates[0],
    weekEnd: dates[dates.length - 1],
    generatedAt: new Date().toISOString(),
    repositories: repos,
    repositoryMetrics,
    users: {}
  };
}

/**
 * Ensure user entry exists in data structure
 * @param {Object} data - Week data object
 * @param {string} username - GitHub username
 */
function ensureUserExists(data, username) {
  if (!data.users[username]) {
    data.users[username] = {
      daily: {},
      weekly: {
        commits: 0,
        prs: 0,
        linesAdded: 0,
        linesDeleted: 0,
        reviewsGiven: 0,
        reviewCommentsGiven: 0,
        discussionCommentsGiven: 0
      }
    };
  }
}

/**
 * Ensure daily entry exists for a user
 * @param {Object} data - Week data object
 * @param {string} username - GitHub username
 * @param {string} date - Date in YYYY-MM-DD format
 */
function ensureDateExists(data, username, date) {
  ensureUserExists(data, username);

  if (!data.users[username].daily[date]) {
    data.users[username].daily[date] = {
      commits: 0,
      prs: 0,
      linesAdded: 0,
      linesDeleted: 0,
      reviewsGiven: 0,
      reviewCommentsGiven: 0,
      discussionCommentsGiven: 0
    };
  }
}

/**
 * Add metrics to a repository's totals
 * @param {Object} data - Week data object
 * @param {string} repository - Repository name (e.g., 'sisp-sweden/ssn-admin')
 * @param {Object} metrics - { commits, prs, linesAdded, linesDeleted, reviewsGiven, etc }
 */
export function addMetricsToRepository(data, repository, metrics = {}) {
  if (!data.repositoryMetrics) {
    data.repositoryMetrics = {};
  }
  if (!data.repositoryMetrics[repository]) {
    data.repositoryMetrics[repository] = {
      commits: 0,
      prs: 0,
      linesAdded: 0,
      linesDeleted: 0,
      reviewsGiven: 0,
      reviewCommentsGiven: 0,
      discussionCommentsGiven: 0
    };
  }

  data.repositoryMetrics[repository].commits += metrics.commits || 0;
  data.repositoryMetrics[repository].prs += metrics.prs || 0;
  data.repositoryMetrics[repository].linesAdded += metrics.linesAdded || 0;
  data.repositoryMetrics[repository].linesDeleted += metrics.linesDeleted || 0;
  data.repositoryMetrics[repository].reviewsGiven += metrics.reviewsGiven || 0;
  data.repositoryMetrics[repository].reviewCommentsGiven += metrics.reviewCommentsGiven || 0;
  data.repositoryMetrics[repository].discussionCommentsGiven += metrics.discussionCommentsGiven || 0;
}

/**
 * Add a commit to the data structure
 * @param {Object} data - Week data object
 * @param {string} username - GitHub username
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} linesAdded - Number of lines added
 * @param {number} linesDeleted - Number of lines deleted
 * @param {string} repository - Repository name for repo metrics tracking
 */
export function addCommitToData(
  data,
  username,
  date,
  linesAdded = 0,
  linesDeleted = 0,
  repository = null
) {
  ensureDateExists(data, username, date);

  data.users[username].daily[date].commits += 1;
  data.users[username].daily[date].linesAdded += linesAdded;
  data.users[username].daily[date].linesDeleted += linesDeleted;

  // Track in repository metrics
  if (repository) {
    addMetricsToRepository(data, repository, {
      commits: 1,
      linesAdded,
      linesDeleted
    });
  }
}

/**
 * Add a PR to the data structure
 * @param {Object} data - Week data object
 * @param {string} username - GitHub username
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} repository - Repository name for repo metrics tracking
 */
export function addPRToData(data, username, date, repository = null) {
  ensureDateExists(data, username, date);
  data.users[username].daily[date].prs += 1;

  // Track in repository metrics
  if (repository) {
    addMetricsToRepository(data, repository, { prs: 1 });
  }
}

/**
 * Add a review to the data structure
 * @param {Object} data - Week data object
 * @param {string} username - GitHub username (reviewer)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} count - Number of reviews (default 1)
 * @param {string} repository - Repository name for repo metrics tracking
 */
export function addReviewToData(data, username, date, count = 1, repository = null) {
  ensureDateExists(data, username, date);
  data.users[username].daily[date].reviewsGiven += count;

  if (repository) {
    addMetricsToRepository(data, repository, { reviewsGiven: count });
  }
}

/**
 * Add review comments to the data structure
 * @param {Object} data - Week data object
 * @param {string} username - GitHub username (commenter)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} count - Number of review comments (default 1)
 * @param {string} repository - Repository name for repo metrics tracking
 */
export function addReviewCommentsToData(data, username, date, count = 1, repository = null) {
  ensureDateExists(data, username, date);
  data.users[username].daily[date].reviewCommentsGiven += count;

  if (repository) {
    addMetricsToRepository(data, repository, { reviewCommentsGiven: count });
  }
}

/**
 * Add discussion comments to the data structure
 * @param {Object} data - Week data object
 * @param {string} username - GitHub username (commenter)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} count - Number of discussion comments (default 1)
 * @param {string} repository - Repository name for repo metrics tracking
 */
export function addDiscussionCommentsToData(data, username, date, count = 1, repository = null) {
  ensureDateExists(data, username, date);
  data.users[username].daily[date].discussionCommentsGiven += count;

  if (repository) {
    addMetricsToRepository(data, repository, { discussionCommentsGiven: count });
  }
}

/**
 * Calculate weekly totals from daily data
 * @param {Object} data - Week data object
 */
export function calculateWeeklyTotals(data) {
  for (const [username, userData] of Object.entries(data.users)) {
    const daily = userData.daily;
    const weekly = userData.weekly;

    // Reset weekly totals
    weekly.commits = 0;
    weekly.prs = 0;
    weekly.linesAdded = 0;
    weekly.linesDeleted = 0;
    weekly.reviewsGiven = 0;
    weekly.reviewCommentsGiven = 0;
    weekly.discussionCommentsGiven = 0;

    // Sum all daily values
    for (const dayData of Object.values(daily)) {
      weekly.commits += dayData.commits || 0;
      weekly.prs += dayData.prs || 0;
      weekly.linesAdded += dayData.linesAdded || 0;
      weekly.linesDeleted += dayData.linesDeleted || 0;
      weekly.reviewsGiven += dayData.reviewsGiven || 0;
      weekly.reviewCommentsGiven += dayData.reviewCommentsGiven || 0;
      weekly.discussionCommentsGiven += dayData.discussionCommentsGiven || 0;
    }
  }
}

/**
 * Merge new data with existing data (preserves existing entries)
 * @param {Object} existingData - Existing week data
 * @param {Object} newData - New week data to merge
 * @returns {Object} Merged data
 */
export function mergeWithExisting(existingData, newData) {
  const merged = JSON.parse(JSON.stringify(existingData)); // Deep copy

  // Merge user data
  for (const [username, userData] of Object.entries(newData.users)) {
    ensureUserExists(merged, username);

    // Merge daily data
    for (const [date, dayData] of Object.entries(userData.daily)) {
      if (!merged.users[username].daily[date]) {
        // New date, add it
        merged.users[username].daily[date] = { ...dayData };
      }
      // If date exists, keep existing data (don't overwrite)
    }
  }

  // Update repositories list
  if (newData.repositories && newData.repositories.length > 0) {
    merged.repositories = [
      ...new Set([...merged.repositories, ...newData.repositories])
    ];
  }

  // Update generated timestamp
  merged.generatedAt = new Date().toISOString();

  // Recalculate weekly totals
  calculateWeeklyTotals(merged);

  return merged;
}

/**
 * Get missing dates in the week for which we have no data
 * @param {Object} data - Week data object
 * @param {Array} allDatesInWeek - Array of all dates in the week
 * @returns {Array} Array of missing dates
 */
export function getMissingDates(data, allDatesInWeek) {
  const missingDates = [];

  for (const date of allDatesInWeek) {
    // Check if any user has data for this date
    let hasDataForDate = false;

    for (const userData of Object.values(data.users)) {
      if (userData.daily[date]) {
        const dayData = userData.daily[date];
        const hasActivity =
          dayData.commits > 0 || dayData.prs > 0 ||
          dayData.linesAdded > 0 || dayData.linesDeleted > 0;

        if (hasActivity) {
          hasDataForDate = true;
          break;
        }
      }
    }

    if (!hasDataForDate) {
      missingDates.push(date);
    }
  }

  return missingDates;
}

/**
 * Check if week data is complete (has data for all dates)
 * @param {Object} data - Week data object
 * @returns {boolean}
 */
export function isWeekDataComplete(data) {
  const allDates = getAllDatesInWeek(
    parseInt(data.week.split('-')[0], 10),
    parseInt(data.week.split('-')[1], 10)
  );

  const missingDates = getMissingDates(data, allDates);
  return missingDates.length === 0;
}

/**
 * Create aggregate statistics for a week
 * @param {Object} data - Week data object
 * @returns {Object} Statistics including totals and averages
 */
export function getWeekStatistics(data) {
  let totalCommits = 0;
  let totalPRs = 0;
  let totalLinesAdded = 0;
  let totalLinesDeleted = 0;
  let activeUsers = 0;

  for (const userData of Object.values(data.users)) {
    const weekly = userData.weekly;
    if (weekly.commits > 0 || weekly.prs > 0) {
      activeUsers++;
    }
    totalCommits += weekly.commits;
    totalPRs += weekly.prs;
    totalLinesAdded += weekly.linesAdded;
    totalLinesDeleted += weekly.linesDeleted;
  }

  return {
    totalCommits,
    totalPRs,
    totalLinesAdded,
    totalLinesDeleted,
    activeUsers,
    averageCommitsPerUser:
      activeUsers > 0 ? Math.round(totalCommits / activeUsers) : 0,
    averagePRsPerUser: activeUsers > 0 ? Math.round(totalPRs / activeUsers) : 0
  };
}
