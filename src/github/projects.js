import chalk from 'chalk';

/**
 * GitHub Projects V2 GraphQL client for fetching kanban board data
 */
export class GitHubProjectsClient {
  constructor(octokit) {
    if (!octokit) {
      throw new Error('Octokit instance is required');
    }
    this.graphql = octokit.graphql.defaults({
      headers: { 'X-GitHub-Media-Type': 'github.v3+json' }
    });
  }

  /**
   * Fetch all Projects V2 items for a repository with assignees and status
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Array>} Array of project items with status and assignees
   */
  async fetchRepositoryProjects(owner, repo) {
    try {
      const query = `
        query($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            projectsV2(first: 10) {
              totalCount
              nodes {
                id
                title
                fields(first: 20) {
                  nodes {
                    ... on ProjectV2SingleSelectField {
                      id
                      name
                      options {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.graphql(query, { owner, repo });
      const projects = response.repository.projectsV2.nodes;

      if (projects.length === 0) {
        console.log(
          chalk.dim(`  ℹ️  No Projects V2 found in ${owner}/${repo}`)
        );
        return [];
      }

      // Fetch items for each project
      const allItems = [];
      for (const project of projects) {
        const items = await this.fetchProjectItems(project.id, owner, repo, project.title);
        allItems.push(...items);
      }

      return allItems;
    } catch (error) {
      if (error.status === 404) {
        console.log(
          chalk.yellow(`  ⚠️  Repository ${owner}/${repo} not found or not accessible`)
        );
        return [];
      }
      console.error(
        chalk.red(`Error fetching projects for ${owner}/${repo}:`),
        error.message
      );
      return [];
    }
  }

  /**
   * Fetch all items in a project with pagination
   * @param {string} projectId - Project V2 ID
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} projectTitle - Project title for reference
   * @returns {Promise<Array>} Array of items with assignees and status
   */
  async fetchProjectItems(projectId, owner, repo, projectTitle) {
    const allItems = [];
    let hasNextPage = true;
    let cursor = null;
    const items = [];

    try {
      while (hasNextPage) {
        const query = `
          query($projectId: ID!, $cursor: String) {
            node(id: $projectId) {
              ... on ProjectV2 {
                items(first: 100, after: $cursor) {
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  nodes {
                    id
                    content {
                      ... on Issue {
                        id
                        title
                        number
                        repository {
                          name
                          owner {
                            login
                          }
                        }
                        assignees(first: 10) {
                          nodes {
                            login
                          }
                        }
                      }
                      ... on PullRequest {
                        id
                        title
                        number
                        repository {
                          name
                          owner {
                            login
                          }
                        }
                        assignees(first: 10) {
                          nodes {
                            login
                          }
                        }
                      }
                    }
                    fieldValueByName(name: "Status") {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const response = await this.graphql(query, {
          projectId,
          cursor
        });

        if (!response.node || !response.node.items) {
          console.error(
            chalk.red(`  Error: Could not fetch items from project ${projectTitle}`)
          );
          break;
        }

        const pageItems = response.node.items.nodes || [];
        items.push(...pageItems);

        hasNextPage = response.node.items.pageInfo.hasNextPage;
        cursor = response.node.items.pageInfo.endCursor;
      }

      // Convert to standardized format
      const formatted = items
        .filter(item => item.content) // Filter out items without content
        .map(item => ({
          id: item.id,
          contentId: item.content.id,
          repository: `${item.content.repository.owner.login}/${item.content.repository.name}`,
          project: projectTitle,
          title: item.content.title,
          number: item.content.number,
          assignees: item.content.assignees.nodes.map(node => node.login),
          status: item.fieldValueByName?.name || null,
          type: item.content.__typename
        }));

      console.log(
        chalk.dim(`  ✓ ${projectTitle}: ${formatted.length} items`)
      );

      return formatted;
    } catch (error) {
      console.error(
        chalk.red(`Error fetching items for project ${projectTitle}:`),
        error.message
      );
      return allItems;
    }
  }
}

/**
 * Fetch kanban snapshot from all repositories
 * @param {GitHubClient} client - GitHub API client
 * @param {Array} repositories - Array of { owner, repo } objects
 * @returns {Promise<Array>} Array of all items from all projects
 */
export async function fetchKanbanSnapshot(client, repositories) {
  const projectsClient = new GitHubProjectsClient(client.octokit);
  const allItems = [];

  console.log(chalk.cyan('\nFetching kanban data from GitHub Projects V2...'));

  for (const { owner, repo } of repositories) {
    // Check rate limit before each repository
    await client.checkAndWaitForRateLimit();

    const items = await projectsClient.fetchRepositoryProjects(owner, repo);
    allItems.push(...items);
  }

  console.log(
    chalk.green(`✓ Collected ${allItems.length} total items from kanban boards\n`)
  );

  return allItems;
}
