import chalk from 'chalk';

/**
 * Fetch all open pull requests from a specific repository
 * @param {GitHubClient} client - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} Array of open pull requests
 */
export async function fetchOpenPRsForRepo(client, owner, repo) {
  console.log(chalk.cyan(`Fetching open PRs from ${owner}/${repo}...`));

  const openPRs = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      await client.checkAndWaitForRateLimit();

      const response = await client.octokit.rest.pulls.list({
        owner,
        repo,
        state: 'open',
        sort: 'created',
        direction: 'desc',
        per_page: 100,
        page
      });

      const processed = response.data.map(pr => ({
        repository: `${owner}/${repo}`,
        repoShort: repo,
        number: pr.number,
        title: pr.title || '',
        author: pr.user?.login || 'Unknown',
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        isDraft: pr.draft || false,
        labels: (pr.labels || []).map(l => ({
          name: l.name,
          color: l.color
        })),
        requestedReviewers: (pr.requested_reviewers || []).map(r => r.login)
      }));

      openPRs.push(...processed);

      hasMore = response.data.length === 100;
      page++;
    } catch (error) {
      if (error.status === 404) {
        console.warn(chalk.yellow(`Repository ${owner}/${repo} not found`));
        hasMore = false;
      } else {
        throw error;
      }
    }
  }

  console.log(chalk.green(`  Found ${openPRs.length} open PRs`));
  return openPRs;
}

/**
 * Fetch all open PRs from all configured repositories
 * @param {GitHubClient} client - GitHub API client
 * @param {Array} repositories - Array of { owner, repo } objects
 * @returns {Promise<Array>} Array of all open PRs
 */
export async function fetchAllOpenPRs(client, repositories) {
  console.log(chalk.bold.cyan('\n Fetching Open Pull Requests\n'));

  const allOpenPRs = [];

  for (let i = 0; i < repositories.length; i++) {
    const { owner, repo } = repositories[i];
    console.log(chalk.blue(`[${i + 1}/${repositories.length}]`));

    try {
      const prs = await fetchOpenPRsForRepo(client, owner, repo);
      allOpenPRs.push(...prs);
    } catch (error) {
      console.error(
        chalk.red(`Error fetching open PRs from ${owner}/${repo}:`),
        error.message
      );
    }
  }

  // Sort by created date (newest first)
  allOpenPRs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  console.log(chalk.bold.green(`\nTotal open PRs: ${allOpenPRs.length}\n`));

  return allOpenPRs;
}

/**
 * Calculate statistics for open PRs
 * @param {Array} prs - Array of open PRs
 * @returns {Object} Statistics object
 */
export function calculateOpenPRStats(prs) {
  const now = new Date();

  // Unique authors
  const authors = new Set(prs.map(pr => pr.author));

  // Repos with open PRs
  const repos = new Set(prs.map(pr => pr.repository));

  // Calculate ages
  const ages = prs.map(pr => {
    const created = new Date(pr.createdAt);
    return Math.floor((now - created) / (1000 * 60 * 60 * 24)); // days
  });

  const oldestAge = ages.length > 0 ? Math.max(...ages) : 0;
  const averageAge = ages.length > 0
    ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length)
    : 0;

  // Draft PRs
  const draftCount = prs.filter(pr => pr.isDraft).length;

  // PRs awaiting review (has requested reviewers)
  const awaitingReview = prs.filter(pr => pr.requestedReviewers.length > 0).length;

  return {
    totalPRs: prs.length,
    uniqueAuthors: authors.size,
    reposWithOpenPRs: repos.size,
    oldestAgeDays: oldestAge,
    averageAgeDays: averageAge,
    draftCount,
    awaitingReview
  };
}

/**
 * Calculate age of a PR in human-readable format
 * @param {string} createdAt - ISO date string
 * @returns {Object} Age info with days and formatted string
 */
export function calculatePRAge(createdAt) {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now - created;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  let formatted;
  if (diffDays === 0) {
    if (diffHours === 0) {
      formatted = 'Just now';
    } else if (diffHours === 1) {
      formatted = '1 hour';
    } else {
      formatted = `${diffHours} hours`;
    }
  } else if (diffDays === 1) {
    formatted = '1 day';
  } else if (diffDays < 7) {
    formatted = `${diffDays} days`;
  } else if (diffDays < 14) {
    formatted = '1 week';
  } else if (diffDays < 30) {
    formatted = `${Math.floor(diffDays / 7)} weeks`;
  } else if (diffDays < 60) {
    formatted = '1 month';
  } else {
    formatted = `${Math.floor(diffDays / 30)} months`;
  }

  return {
    days: diffDays,
    hours: diffHours,
    formatted
  };
}
