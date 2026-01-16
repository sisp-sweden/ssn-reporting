import { Octokit } from '@octokit/rest';
import chalk from 'chalk';

/**
 * GitHub API client wrapper with rate limiting and error handling
 */
export class GitHubClient {
  constructor(token) {
    if (!token) {
      throw new Error('GitHub token is required. Please set GITHUB_TOKEN in .env');
    }

    this.octokit = new Octokit({
      auth: token,
      request: {
        timeout: 30000
      }
    });

    this.requestCount = 0;
    this.rateLimitCheckedAt = 0;
    this.lastRateLimit = null;
  }

  /**
   * Get current rate limit status
   * @returns {Promise<Object>} Rate limit information
   */
  async getRateLimit() {
    try {
      const response = await this.octokit.rest.rateLimit.get();
      return response.data;
    } catch (error) {
      console.error(chalk.red('Error fetching rate limit:'), error.message);
      throw error;
    }
  }

  /**
   * Check rate limit and wait if needed
   * @returns {Promise<void>}
   */
  async checkAndWaitForRateLimit() {
    try {
      const rateLimit = await this.getRateLimit();
      const remaining = rateLimit.resources.core.remaining;
      const limit = rateLimit.resources.core.limit;
      const resetTime = rateLimit.resources.core.reset;

      this.lastRateLimit = rateLimit;

      if (remaining < 100) {
        const now = Math.floor(Date.now() / 1000);
        const waitSeconds = resetTime - now;

        if (waitSeconds > 0) {
          console.warn(
            chalk.yellow(
              `⚠️  Rate limit approaching (${remaining}/${limit} remaining)`
            )
          );
          console.warn(chalk.yellow(`Waiting ${waitSeconds} seconds for reset...`));
          await this.sleep(waitSeconds * 1000 + 1000); // Add 1 second buffer
        }
      }
    } catch (error) {
      console.warn(chalk.yellow('Could not check rate limit:'), error.message);
      // Continue anyway, don't fail the whole process
    }
  }

  /**
   * Fetch commits for a repository within a date range
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} since - Start date (ISO 8601)
   * @param {string} until - End date (ISO 8601)
   * @returns {Promise<Array>} Array of commits
   */
  async getCommits(owner, repo, since, until) {
    const commits = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        await this.checkAndWaitForRateLimit();

        const response = await this.octokit.rest.repos.listCommits({
          owner,
          repo,
          since,
          until,
          per_page: 100,
          page
        });

        commits.push(...response.data);
        this.requestCount++;

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

    return commits;
  }

  /**
   * Fetch pull requests for a repository within a date range
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} since - Start date (ISO 8601)
   * @returns {Promise<Array>} Array of pull requests
   */
  async getPullRequests(owner, repo, since) {
    const pullRequests = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        await this.checkAndWaitForRateLimit();

        const response = await this.octokit.rest.pulls.list({
          owner,
          repo,
          state: 'all',
          sort: 'created',
          direction: 'desc',
          per_page: 100,
          page
        });

        // Filter by date in application layer
        const filtered = response.data.filter(pr => {
          const prDate = new Date(pr.created_at).toISOString().split('T')[0];
          return prDate >= since;
        });

        pullRequests.push(...filtered);
        this.requestCount++;

        // Stop if we've gone past the since date
        if (
          response.data.length > 0 &&
          new Date(response.data[response.data.length - 1].created_at)
            .toISOString()
            .split('T')[0] < since
        ) {
          hasMore = false;
        } else if (response.data.length < 100) {
          hasMore = false;
        } else {
          page++;
        }
      } catch (error) {
        if (error.status === 404) {
          console.warn(chalk.yellow(`Repository ${owner}/${repo} not found`));
          hasMore = false;
        } else {
          throw error;
        }
      }
    }

    return pullRequests;
  }

  /**
   * Get detailed information about a commit including stats
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} sha - Commit SHA
   * @returns {Promise<Object>} Commit details with stats
   */
  async getCommitDetails(owner, repo, sha) {
    try {
      await this.checkAndWaitForRateLimit();

      const response = await this.octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: sha
      });

      this.requestCount++;
      return response.data;
    } catch (error) {
      if (error.status === 404) {
        console.warn(chalk.yellow(`Commit ${sha} not found in ${owner}/${repo}`));
        return null;
      }
      throw error;
    }
  }

  /**
   * Sleep helper function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the number of API requests made
   * @returns {number}
   */
  getRequestCount() {
    return this.requestCount;
  }

  /**
   * Get last cached rate limit info
   * @returns {Object|null}
   */
  getLastRateLimit() {
    return this.lastRateLimit;
  }
}
