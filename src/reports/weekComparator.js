/**
 * Week-over-week comparison logic
 */

/**
 * Calculate the percentage change between two values
 * Handles edge cases: zero values, new contributors, etc.
 * @param {number} current - Current week's value
 * @param {number} previous - Previous week's value
 * @returns {Object} { change: number (percentage), delta: number (absolute change), isNew: boolean, isInactive: boolean }
 */
export function calculatePercentageChange(current, previous) {
  // Both zero
  if (current === 0 && previous === 0) {
    return {
      change: 0,
      delta: 0,
      isNew: false,
      isInactive: false,
      isNoData: true
    };
  }

  // New contributor (wasn't active before)
  if (current > 0 && previous === 0) {
    return {
      change: Infinity,
      delta: current,
      isNew: true,
      isInactive: false,
      isNoData: false
    };
  }

  // Contributor went inactive
  if (current === 0 && previous > 0) {
    return {
      change: -100,
      delta: -previous,
      isNew: false,
      isInactive: true,
      isNoData: false
    };
  }

  // Normal case: both have values
  const change = ((current - previous) / previous) * 100;
  const delta = current - previous;

  return {
    change: Math.round(change * 10) / 10, // Round to 1 decimal place
    delta,
    isNew: false,
    isInactive: false,
    isNoData: false
  };
}

/**
 * Compare two complete weeks and return detailed comparison data
 * @param {Object} currentWeekData - Current week's data from JSON file
 * @param {Object} previousWeekData - Previous week's data from JSON file (can be null)
 * @returns {Object} Comparison object with team and user-level metrics
 */
export function compareWeeks(currentWeekData, previousWeekData) {
  // If no previous week exists, return structure with N/A comparisons
  if (!previousWeekData) {
    return {
      currentWeek: currentWeekData.week,
      previousWeek: null,
      hasPreviousWeek: false,
      comparisons: {
        team: {
          commits: { current: getTotalCommits(currentWeekData), previous: 0, ...calculatePercentageChange(getTotalCommits(currentWeekData), 0) },
          prs: { current: getTotalPRs(currentWeekData), previous: 0, ...calculatePercentageChange(getTotalPRs(currentWeekData), 0) },
          linesAdded: { current: getTotalLinesAdded(currentWeekData), previous: 0, ...calculatePercentageChange(getTotalLinesAdded(currentWeekData), 0) },
          linesDeleted: { current: getTotalLinesDeleted(currentWeekData), previous: 0, ...calculatePercentageChange(getTotalLinesDeleted(currentWeekData), 0) }
        },
        users: {}
      }
    };
  }

  // Get team-level metrics
  const currentCommits = getTotalCommits(currentWeekData);
  const previousCommits = getTotalCommits(previousWeekData);
  const currentPRs = getTotalPRs(currentWeekData);
  const previousPRs = getTotalPRs(previousWeekData);
  const currentLinesAdded = getTotalLinesAdded(currentWeekData);
  const previousLinesAdded = getTotalLinesAdded(previousWeekData);
  const currentLinesDeleted = getTotalLinesDeleted(currentWeekData);
  const previousLinesDeleted = getTotalLinesDeleted(previousWeekData);

  // Build comparison object
  const comparison = {
    currentWeek: currentWeekData.week,
    previousWeek: previousWeekData.week,
    hasPreviousWeek: true,
    comparisons: {
      team: {
        commits: {
          current: currentCommits,
          previous: previousCommits,
          ...calculatePercentageChange(currentCommits, previousCommits)
        },
        prs: {
          current: currentPRs,
          previous: previousPRs,
          ...calculatePercentageChange(currentPRs, previousPRs)
        },
        linesAdded: {
          current: currentLinesAdded,
          previous: previousLinesAdded,
          ...calculatePercentageChange(currentLinesAdded, previousLinesAdded)
        },
        linesDeleted: {
          current: currentLinesDeleted,
          previous: previousLinesDeleted,
          ...calculatePercentageChange(currentLinesDeleted, previousLinesDeleted)
        }
      },
      users: {}
    }
  };

  // Compare user metrics
  const currentUsers = Object.keys(currentWeekData.users || {});
  const previousUsers = Object.keys(previousWeekData.users || {});
  const allUsers = new Set([...currentUsers, ...previousUsers]);

  for (const username of allUsers) {
    const currentUserData = currentWeekData.users[username] || { weekly: { commits: 0, prs: 0, linesAdded: 0, linesDeleted: 0 } };
    const previousUserData = previousWeekData.users[username] || { weekly: { commits: 0, prs: 0, linesAdded: 0, linesDeleted: 0 } };

    const currentWeekly = currentUserData.weekly || { commits: 0, prs: 0, linesAdded: 0, linesDeleted: 0 };
    const previousWeekly = previousUserData.weekly || { commits: 0, prs: 0, linesAdded: 0, linesDeleted: 0 };

    comparison.comparisons.users[username] = {
      commits: {
        current: currentWeekly.commits || 0,
        previous: previousWeekly.commits || 0,
        ...calculatePercentageChange(currentWeekly.commits || 0, previousWeekly.commits || 0)
      },
      prs: {
        current: currentWeekly.prs || 0,
        previous: previousWeekly.prs || 0,
        ...calculatePercentageChange(currentWeekly.prs || 0, previousWeekly.prs || 0)
      },
      linesAdded: {
        current: currentWeekly.linesAdded || 0,
        previous: previousWeekly.linesAdded || 0,
        ...calculatePercentageChange(currentWeekly.linesAdded || 0, previousWeekly.linesAdded || 0)
      },
      linesDeleted: {
        current: currentWeekly.linesDeleted || 0,
        previous: previousWeekly.linesDeleted || 0,
        ...calculatePercentageChange(currentWeekly.linesDeleted || 0, previousWeekly.linesDeleted || 0)
      }
    };
  }

  return comparison;
}

/**
 * Compare multiple weeks and return per-user and per-team metric arrays indexed by week
 * @param {Array<Object>} weeksData - Array of week data objects in chronological order
 * @returns {Object} { weeks, team, users } with time-series data
 */
export function compareMultipleWeeks(weeksData) {
  if (!weeksData || weeksData.length === 0) {
    return { weeks: [], team: [], users: {} };
  }

  const weeks = weeksData.map(w => w.week);

  // Build team totals per week
  const team = weeksData.map(weekData => ({
    week: weekData.week,
    commits: getTotalCommits(weekData),
    prs: getTotalPRs(weekData),
    linesAdded: getTotalLinesAdded(weekData),
    linesDeleted: getTotalLinesDeleted(weekData),
    reviewsGiven: getTotalMetric(weekData, 'reviewsGiven'),
    reviewCommentsGiven: getTotalMetric(weekData, 'reviewCommentsGiven'),
    discussionCommentsGiven: getTotalMetric(weekData, 'discussionCommentsGiven')
  }));

  // Collect all usernames across all weeks
  const allUsernames = new Set();
  for (const weekData of weeksData) {
    if (weekData.users) {
      for (const username of Object.keys(weekData.users)) {
        allUsernames.add(username);
      }
    }
  }

  // Build per-user time-series
  const users = {};
  for (const username of allUsernames) {
    users[username] = weeksData.map(weekData => {
      const userData = weekData.users?.[username];
      const weekly = userData?.weekly || {};
      return {
        week: weekData.week,
        commits: weekly.commits || 0,
        prs: weekly.prs || 0,
        linesAdded: weekly.linesAdded || 0,
        linesDeleted: weekly.linesDeleted || 0,
        reviewsGiven: weekly.reviewsGiven || 0,
        reviewCommentsGiven: weekly.reviewCommentsGiven || 0,
        discussionCommentsGiven: weekly.discussionCommentsGiven || 0
      };
    });
  }

  // Build per-repository totals
  const repositories = {};
  for (const weekData of weeksData) {
    if (weekData.repositoryMetrics) {
      for (const [repo, metrics] of Object.entries(weekData.repositoryMetrics)) {
        if (!repositories[repo]) {
          repositories[repo] = [];
        }
        repositories[repo].push({
          week: weekData.week,
          ...metrics
        });
      }
    }
  }

  return { weeks, team, users, repositories };
}

/**
 * Get total of a specific metric from a week's data
 * @param {Object} weekData - Week data object
 * @param {string} metricName - Name of the metric field
 * @returns {number} Total
 */
function getTotalMetric(weekData, metricName) {
  let total = 0;
  for (const username in weekData.users || {}) {
    total += (weekData.users[username].weekly?.[metricName]) || 0;
  }
  return total;
}

/**
 * Get total commits from a week's data
 * @param {Object} weekData - Week data object
 * @returns {number} Total commits
 */
function getTotalCommits(weekData) {
  let total = 0;
  for (const username in weekData.users || {}) {
    total += (weekData.users[username].weekly?.commits) || 0;
  }
  return total;
}

/**
 * Get total PRs from a week's data
 * @param {Object} weekData - Week data object
 * @returns {number} Total PRs
 */
function getTotalPRs(weekData) {
  let total = 0;
  for (const username in weekData.users || {}) {
    total += (weekData.users[username].weekly?.prs) || 0;
  }
  return total;
}

/**
 * Get total lines added from a week's data
 * @param {Object} weekData - Week data object
 * @returns {number} Total lines added
 */
function getTotalLinesAdded(weekData) {
  let total = 0;
  for (const username in weekData.users || {}) {
    total += (weekData.users[username].weekly?.linesAdded) || 0;
  }
  return total;
}

/**
 * Get total lines deleted from a week's data
 * @param {Object} weekData - Week data object
 * @returns {number} Total lines deleted
 */
function getTotalLinesDeleted(weekData) {
  let total = 0;
  for (const username in weekData.users || {}) {
    total += (weekData.users[username].weekly?.linesDeleted) || 0;
  }
  return total;
}
