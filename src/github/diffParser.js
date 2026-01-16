/**
 * Diff statistics utilities
 * Note: GitHub API already provides additions/deletions in commit details,
 * so we mainly use this for validation and additional processing
 */

/**
 * Validate line change statistics
 * @param {number} additions - Lines added
 * @param {number} deletions - Lines deleted
 * @returns {Object} Validated statistics
 */
export function validateLineStats(additions = 0, deletions = 0) {
  const add = Math.max(0, parseInt(additions, 10) || 0);
  const del = Math.max(0, parseInt(deletions, 10) || 0);

  return {
    additions: add,
    deletions: del,
    total: add + del
  };
}

/**
 * Aggregate line changes from multiple commits
 * @param {Array} commits - Array of commit objects with additions/deletions
 * @returns {Object} Aggregated line changes { additions, deletions, total }
 */
export function aggregateLineChanges(commits) {
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const commit of commits) {
    totalAdditions += commit.additions || 0;
    totalDeletions += commit.deletions || 0;
  }

  return {
    additions: totalAdditions,
    deletions: totalDeletions,
    total: totalAdditions + totalDeletions,
    commits: commits.length
  };
}

/**
 * Calculate code churn percentage
 * @param {number} additions - Lines added
 * @param {number} deletions - Lines deleted
 * @returns {number} Churn percentage (0-100)
 */
export function calculateChurnPercentage(additions, deletions) {
  const total = additions + deletions;
  if (total === 0) return 0;

  // Higher deletion ratio = higher churn
  return Math.round((deletions / total) * 100);
}

/**
 * Calculate net code change
 * @param {number} additions - Lines added
 * @param {number} deletions - Lines deleted
 * @returns {number} Net change (positive = growth, negative = reduction)
 */
export function calculateNetChange(additions, deletions) {
  return additions - deletions;
}

/**
 * Categorize commit size
 * @param {number} additions - Lines added
 * @param {number} deletions - Lines deleted
 * @returns {string} Size category: 'trivial', 'small', 'medium', 'large', 'huge'
 */
export function categorizCommitSize(additions, deletions) {
  const total = additions + deletions;

  if (total === 0) return 'trivial';
  if (total <= 10) return 'small';
  if (total <= 50) return 'medium';
  if (total <= 200) return 'large';
  return 'huge';
}
