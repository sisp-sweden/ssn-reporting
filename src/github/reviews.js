import chalk from 'chalk';

/**
 * Fetch reviews for a specific pull request
 * @param {GitHubClient} client - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} pullNumber - PR number
 * @returns {Promise<Array>} Array of reviews
 */
export async function fetchReviewsForPR(client, owner, repo, pullNumber) {
  try {
    await client.checkAndWaitForRateLimit();

    const response = await client.octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100
    });

    client.requestCount++;

    return response.data.map(review => ({
      id: review.id,
      reviewer: review.user?.login || 'Unknown',
      state: review.state, // APPROVED, CHANGES_REQUESTED, COMMENTED, etc.
      body: review.body || '',
      submittedAt: review.submitted_at,
      commitId: review.commit_id
    }));
  } catch (error) {
    if (error.status === 404) {
      console.warn(chalk.yellow(`PR #${pullNumber} not found in ${owner}/${repo}`));
      return [];
    }
    throw error;
  }
}

/**
 * Fetch review comments (line-specific) for a pull request
 * @param {GitHubClient} client - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} pullNumber - PR number
 * @returns {Promise<Array>} Array of review comments
 */
export async function fetchReviewCommentsForPR(client, owner, repo, pullNumber) {
  try {
    await client.checkAndWaitForRateLimit();

    const response = await client.octokit.rest.pulls.listReviewComments({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100
    });

    client.requestCount++;

    return response.data.map(comment => ({
      id: comment.id,
      author: comment.user?.login || 'Unknown',
      body: comment.body || '',
      path: comment.path,
      line: comment.line,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at
    }));
  } catch (error) {
    if (error.status === 404) {
      console.warn(chalk.yellow(`PR #${pullNumber} not found in ${owner}/${repo}`));
      return [];
    }
    throw error;
  }
}

/**
 * Fetch general discussion comments for a pull request
 * @param {GitHubClient} client - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} pullNumber - PR number (issues and PRs share the same numbering)
 * @returns {Promise<Array>} Array of discussion comments
 */
export async function fetchDiscussionCommentsForPR(client, owner, repo, pullNumber) {
  try {
    await client.checkAndWaitForRateLimit();

    const response = await client.octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: pullNumber,
      per_page: 100
    });

    client.requestCount++;

    return response.data.map(comment => ({
      id: comment.id,
      author: comment.user?.login || 'Unknown',
      body: comment.body || '',
      createdAt: comment.created_at,
      updatedAt: comment.updated_at
    }));
  } catch (error) {
    if (error.status === 404) {
      console.warn(chalk.yellow(`PR #${pullNumber} not found in ${owner}/${repo}`));
      return [];
    }
    throw error;
  }
}

/**
 * Fetch all review data for PRs in a repository within a date range
 * @param {GitHubClient} client - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Array} prs - Array of PR objects with number, created_at, author
 * @returns {Promise<Object>} Object with reviews, reviewComments, discussionComments arrays
 */
export async function fetchReviewDataForPRs(client, owner, repo, prs) {
  console.log(chalk.cyan(`Fetching review data for ${prs.length} PRs from ${owner}/${repo}...`));

  const allReviews = [];
  const allReviewComments = [];
  const allDiscussionComments = [];

  for (const pr of prs) {
    // Fetch reviews
    const reviews = await fetchReviewsForPR(client, owner, repo, pr.number);
    allReviews.push(...reviews.map(r => ({
      ...r,
      repository: `${owner}/${repo}`,
      prNumber: pr.number,
      prAuthor: pr.author
    })));

    // Fetch review comments (line-specific)
    const reviewComments = await fetchReviewCommentsForPR(client, owner, repo, pr.number);
    allReviewComments.push(...reviewComments.map(c => ({
      ...c,
      repository: `${owner}/${repo}`,
      prNumber: pr.number,
      prAuthor: pr.author
    })));

    // Fetch discussion comments
    const discussionComments = await fetchDiscussionCommentsForPR(client, owner, repo, pr.number);
    allDiscussionComments.push(...discussionComments.map(c => ({
      ...c,
      repository: `${owner}/${repo}`,
      prNumber: pr.number,
      prAuthor: pr.author
    })));
  }

  console.log(chalk.green(
    `  ✓ Found ${allReviews.length} reviews, ${allReviewComments.length} review comments, ${allDiscussionComments.length} discussion comments`
  ));

  return {
    reviews: allReviews,
    reviewComments: allReviewComments,
    discussionComments: allDiscussionComments
  };
}

/**
 * Group reviews by reviewer and date
 * @param {Array} reviews - Array of review objects
 * @returns {Object} Grouped reviews { reviewer: { date: count } }
 */
export function countReviewsByUserAndDate(reviews) {
  const stats = {};

  for (const review of reviews) {
    const reviewer = review.reviewer;
    const dateStr = review.submittedAt.split('T')[0];

    if (!stats[reviewer]) {
      stats[reviewer] = {};
    }

    if (!stats[reviewer][dateStr]) {
      stats[reviewer][dateStr] = 0;
    }

    stats[reviewer][dateStr]++;
  }

  return stats;
}

/**
 * Count review comments by author and date
 * @param {Array} comments - Array of review comment objects
 * @returns {Object} Grouped comments { author: { date: count } }
 */
export function countReviewCommentsByUserAndDate(comments) {
  const stats = {};

  for (const comment of comments) {
    const author = comment.author;
    const dateStr = comment.createdAt.split('T')[0];

    if (!stats[author]) {
      stats[author] = {};
    }

    if (!stats[author][dateStr]) {
      stats[author][dateStr] = 0;
    }

    stats[author][dateStr]++;
  }

  return stats;
}

/**
 * Count discussion comments by author and date
 * @param {Array} comments - Array of discussion comment objects
 * @returns {Object} Grouped comments { author: { date: count } }
 */
export function countDiscussionCommentsByUserAndDate(comments) {
  const stats = {};

  for (const comment of comments) {
    const author = comment.author;
    const dateStr = comment.createdAt.split('T')[0];

    if (!stats[author]) {
      stats[author] = {};
    }

    if (!stats[author][dateStr]) {
      stats[author][dateStr] = 0;
    }

    stats[author][dateStr]++;
  }

  return stats;
}
