import chalk from 'chalk';
import { GitHubClient } from './github/client.js';
import { repositories } from './config/repositories.js';

/**
 * Run daily summary for a given date and GitHub username.
 * Outputs a short Slack-ready summary to stdout.
 * @param {string} dateArg - Date specification: YYYY-MM-DD, YYMMDD, 'yesterday', or '-N' for N days ago
 * @param {string} githubToken - GitHub API token
 * @param {string} githubUsername - GitHub username to filter by
 * @param {boolean} compact - If true, use compact standup format (DS: prefix, single line)
 */
export async function runDailySummary(dateArg, githubToken, githubUsername, compact = false) {
  const date = parseDateArg(dateArg);
  const client = new GitHubClient(githubToken);
  const username = githubUsername.toLowerCase();

  // Date range: start of day to start of next day
  const since = `${date}T00:00:00Z`;
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const until = `${nextDay.toISOString().split('T')[0]}T00:00:00Z`;

  const dayLabel = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  console.log(chalk.dim(`Fetching activity for ${username} on ${date}...\n`));

  // Fetch commits, PRs created, and PRs reviewed in parallel
  const [commits, prsCreated, prsReviewed] = await Promise.all([
    fetchMyCommits(client, username, since, until),
    fetchMyPRs(client, username, date),
    fetchMyReviews(client, username, date)
  ]);

  // Build output
  const sections = [];

  if (commits.length > 0) {
    // Group commits with identical messages
    const grouped = new Map();
    for (const c of commits) {
      const existing = grouped.get(c.message);
      if (existing) {
        if (!existing.repos.includes(c.repo)) existing.repos.push(c.repo);
        existing.count++;
      } else {
        grouped.set(c.message, { repos: [c.repo], count: 1 });
      }
    }
    const lines = [...grouped.entries()].map(([msg, { repos, count }]) => {
      const repoStr = repos.join(', ');
      const countStr = count > repos.length ? ` ×${count}` : '';
      return `• ${msg} (${repoStr})${countStr}`;
    });
    sections.push(`💻 ${commits.length} commit${commits.length > 1 ? 's' : ''}\n${lines.join('\n')}`);
  }

  if (prsCreated.length > 0) {
    const lines = prsCreated.map(pr => `• #${pr.number} ${pr.title} (${pr.repo})`);
    sections.push(`🚀 ${prsCreated.length} PR${prsCreated.length > 1 ? 's' : ''} raised\n${lines.join('\n')}`);
  }

  if (prsReviewed.length > 0) {
    const lines = prsReviewed.map(pr => `• #${pr.number} ${pr.title} (${pr.repo})`);
    sections.push(`👀 ${prsReviewed.length} PR${prsReviewed.length > 1 ? 's' : ''} reviewed\n${lines.join('\n')}`);
  }

  if (sections.length === 0) {
    if (compact) {
      console.log(`DS: No activity`);
    } else {
      console.log(`📅 Daily Summary — ${dayLabel}\n\nNo GitHub activity found for this date.`);
    }
    return;
  }

  if (compact) {
    // Compact format: DS: 14 commits • msg1 (repo1, repo2) • msg2 (repo3)
    const bullets = [];

    if (commits.length > 0) {
      bullets.push(`${commits.length} commits`);
      // Group commits with identical messages
      const grouped = new Map();
      for (const c of commits) {
        const existing = grouped.get(c.message);
        if (existing) {
          if (!existing.repos.includes(c.repo)) existing.repos.push(c.repo);
          existing.count++;
        } else {
          grouped.set(c.message, { repos: [c.repo], count: 1 });
        }
      }
      for (const [msg, { repos, count }] of grouped.entries()) {
        const repoStr = repos.join(', ');
        const countStr = count > repos.length ? ` ×${count}` : '';
        bullets.push(`${msg} (${repoStr})${countStr}`);
      }
    }

    if (prsCreated.length > 0) {
      bullets.push(`${prsCreated.length} PRs raised`);
      for (const pr of prsCreated) {
        bullets.push(`#${pr.number} ${pr.title} (${pr.repo})`);
      }
    }

    if (prsReviewed.length > 0) {
      bullets.push(`${prsReviewed.length} reviewed`);
      for (const pr of prsReviewed) {
        bullets.push(`#${pr.number} ${pr.title} (${pr.repo})`);
      }
    }

    console.log(`DS: ${bullets.join('\n• ')}`);
  } else {
    const output = `📅 Daily Summary — ${dayLabel}\n\n${sections.join('\n\n')}`;
    console.log(output);
  }
}

async function fetchMyCommits(client, username, since, until) {
  const results = [];

  for (const { owner, repo } of repositories) {
    try {
      const commits = await client.getCommits(owner, repo, since, until);
      for (const commit of commits) {
        const author = (commit.author?.login || commit.commit?.author?.name || '').toLowerCase();
        if (author === username) {
          const message = commit.commit.message.split('\n')[0]; // first line only
          results.push({ message, repo });
        }
      }
    } catch {
      // skip repos that error
    }
  }

  return results;
}

async function fetchMyPRs(client, username, date) {
  const results = [];

  for (const { owner, repo } of repositories) {
    try {
      const prs = await client.getPullRequests(owner, repo, date);
      for (const pr of prs) {
        const prDate = new Date(pr.created_at).toISOString().split('T')[0];
        const author = (pr.user?.login || '').toLowerCase();
        if (author === username && prDate === date) {
          results.push({ number: pr.number, title: pr.title, repo });
        }
      }
    } catch {
      // skip repos that error
    }
  }

  return results;
}

async function fetchMyReviews(client, username, date) {
  const results = [];

  // Use GitHub search API for reviews
  try {
    const query = `type:pr reviewed-by:${username} updated:${date}`;
    const response = await client.octokit.rest.search.issuesAndPullRequests({
      q: query,
      per_page: 50,
      sort: 'updated',
      order: 'desc'
    });

    for (const item of response.data.items) {
      const repoFullName = item.repository_url.split('/').slice(-2).join('/');
      const repoShort = repoFullName.split('/').pop();
      results.push({ number: item.number, title: item.title, repo: repoShort });
    }
  } catch {
    // search API may fail, that's ok
  }

  return results;
}

/**
 * Parse date argument in various formats.
 * Supports: YYYY-MM-DD, YYMMDD, 'yesterday', '-N' (N days ago)
 * @param {string} arg - Date specification
 * @returns {string} YYYY-MM-DD formatted date
 */
function parseDateArg(arg) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
    return arg;
  }

  // YYMMDD format (e.g., 260211)
  if (/^\d{6}$/.test(arg)) {
    const yy = parseInt(arg.slice(0, 2), 10);
    const mm = parseInt(arg.slice(2, 4), 10);
    const dd = parseInt(arg.slice(4, 6), 10);
    const year = yy < 50 ? 2000 + yy : 1900 + yy; // 00-49 → 2000-2049, 50-99 → 1950-1999
    const date = new Date(year, mm - 1, dd);
    return date.toISOString().split('T')[0];
  }

  // 'yesterday' keyword
  if (arg.toLowerCase() === 'yesterday') {
    const date = new Date(today);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  }

  // Relative format: -N (N days ago)
  const match = arg.match(/^-(\d+)$/);
  if (match) {
    const daysAgo = parseInt(match[1], 10);
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }

  // Default: return as-is (assume YYYY-MM-DD)
  return arg;
}
