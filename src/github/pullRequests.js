import chalk from 'chalk';

/**
 * Fetch pull requests for a specific repository within a date range
 * @param {GitHubClient} client - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} since - Start date (ISO 8601)
 * @returns {Promise<Array>} Array of processed pull requests
 */
export async function fetchPRsForRepo(client, owner, repo, since) {
  console.log(
    chalk.cyan(`Fetching PRs from ${owner}/${repo}...`)
  );

  try {
    const prs = await client.getPullRequests(owner, repo, since);

    const processed = prs.map(pr => ({
      repository: `${owner}/${repo}`,
      number: pr.number,
      author: pr.user?.login || 'Unknown',
      createdAt: pr.created_at,
      title: pr.title || '',
      state: pr.state,
      url: pr.html_url
    }));

    console.log(
      chalk.green(`  ✓ Found ${processed.length} pull requests`)
    );
    return processed;
  } catch (error) {
    console.error(
      chalk.red(`Error fetching PRs from ${owner}/${repo}:`),
      error.message
    );
    return [];
  }
}

/**
 * Fetch PRs from all repositories within a date range
 * @param {GitHubClient} client - GitHub API client
 * @param {Array} repositories - Array of { owner, repo } objects
 * @param {string} since - Start date (ISO 8601)
 * @returns {Promise<Array>} Array of all PRs from all repos
 */
export async function fetchPRsForDateRange(client, repositories, since) {
  const allPRs = [];

  for (let i = 0; i < repositories.length; i++) {
    const { owner, repo } = repositories[i];
    console.log(chalk.blue(`[${i + 1}/${repositories.length}]`));

    const prs = await fetchPRsForRepo(client, owner, repo, since);
    allPRs.push(...prs);
  }

  return allPRs;
}

/**
 * Group PRs by username and date
 * @param {Array} prs - Array of pull requests
 * @returns {Object} Grouped PRs { user: { date: [prs] } }
 */
export function groupPRsByUserAndDate(prs) {
  const grouped = {};

  for (const pr of prs) {
    const username = pr.author;
    const dateStr = pr.createdAt.split('T')[0]; // Extract date portion

    if (!grouped[username]) {
      grouped[username] = {};
    }

    if (!grouped[username][dateStr]) {
      grouped[username][dateStr] = [];
    }

    grouped[username][dateStr].push(pr);
  }

  return grouped;
}

/**
 * Count PRs by user and date
 * @param {Array} prs - Array of pull requests
 * @returns {Object} PR counts { user: { date: count } }
 */
export function countPRsByUserAndDate(prs) {
  const grouped = groupPRsByUserAndDate(prs);
  const stats = {};

  for (const [username, dateMap] of Object.entries(grouped)) {
    stats[username] = {};

    for (const [date, userPRs] of Object.entries(dateMap)) {
      stats[username][date] = userPRs.length;
    }
  }

  return stats;
}
