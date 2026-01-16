import chalk from 'chalk';

/**
 * Fetch commits for a specific repository within a date range
 * @param {GitHubClient} client - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} since - Start date (ISO 8601)
 * @param {string} until - End date (ISO 8601)
 * @returns {Promise<Array>} Array of processed commits
 */
export async function fetchCommitsForRepo(client, owner, repo, since, until) {
  console.log(
    chalk.cyan(`Fetching commits from ${owner}/${repo}...`)
  );

  try {
    const commits = await client.getCommits(owner, repo, since, until);

    const processed = [];
    for (const commit of commits) {
      // Skip merge commits (they have multiple parents)
      if (commit.parents && commit.parents.length > 1) {
        continue;
      }

      const details = await client.getCommitDetails(owner, repo, commit.sha);
      if (!details) continue;

      processed.push({
        repository: `${owner}/${repo}`,
        sha: commit.sha,
        author: commit.commit?.author?.name || 'Unknown',
        authorLogin: commit.author?.login || null,
        email: commit.commit?.author?.email || null,
        date: commit.commit?.author?.date || null,
        message: commit.commit?.message || '',
        additions: details.stats?.additions || 0,
        deletions: details.stats?.deletions || 0
      });
    }

    console.log(
      chalk.green(`  ✓ Found ${processed.length} commits`)
    );
    return processed;
  } catch (error) {
    console.error(
      chalk.red(`Error fetching commits from ${owner}/${repo}:`),
      error.message
    );
    return [];
  }
}

/**
 * Fetch commits from all repositories within a date range
 * @param {GitHubClient} client - GitHub API client
 * @param {Array} repositories - Array of { owner, repo } objects
 * @param {string} since - Start date (ISO 8601)
 * @param {string} until - End date (ISO 8601)
 * @returns {Promise<Array>} Array of all commits from all repos
 */
export async function fetchCommitsForDateRange(
  client,
  repositories,
  since,
  until
) {
  const allCommits = [];

  for (let i = 0; i < repositories.length; i++) {
    const { owner, repo } = repositories[i];
    console.log(chalk.blue(`[${i + 1}/${repositories.length}]`));

    const commits = await fetchCommitsForRepo(client, owner, repo, since, until);
    allCommits.push(...commits);
  }

  return allCommits;
}

/**
 * Extract user login from commit (handles various formats)
 * @param {Object} commit - Processed commit object
 * @returns {string} GitHub username or email
 */
export function extractUsername(commit) {
  if (commit.authorLogin) {
    return commit.authorLogin;
  }

  if (commit.email) {
    // Extract username from email (part before @)
    const match = commit.email.match(/^([^@]+)@/);
    if (match) {
      return match[1];
    }
  }

  // Fallback to sanitized author name
  if (commit.author) {
    return commit.author.toLowerCase().replace(/\s+/g, '-');
  }

  return 'unknown';
}

/**
 * Group commits by username and date
 * @param {Array} commits - Array of commits
 * @returns {Object} Grouped commits { user: { date: [commits] } }
 */
export function groupCommitsByUserAndDate(commits) {
  const grouped = {};

  for (const commit of commits) {
    const username = extractUsername(commit);
    const dateStr = commit.date.split('T')[0]; // Extract date portion

    if (!grouped[username]) {
      grouped[username] = {};
    }

    if (!grouped[username][dateStr]) {
      grouped[username][dateStr] = [];
    }

    grouped[username][dateStr].push(commit);
  }

  return grouped;
}

/**
 * Aggregate commit stats by user and date
 * @param {Array} commits - Array of commits
 * @returns {Object} Aggregated stats { user: { date: { commits, additions, deletions } } }
 */
export function aggregateCommitStats(commits) {
  const grouped = groupCommitsByUserAndDate(commits);
  const stats = {};

  for (const [username, dateMap] of Object.entries(grouped)) {
    stats[username] = {};

    for (const [date, userCommits] of Object.entries(dateMap)) {
      stats[username][date] = {
        commits: userCommits.length,
        linesAdded: userCommits.reduce((sum, c) => sum + c.additions, 0),
        linesDeleted: userCommits.reduce((sum, c) => sum + c.deletions, 0)
      };
    }
  }

  return stats;
}
