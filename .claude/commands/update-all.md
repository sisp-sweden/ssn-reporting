---
allowed-tools: Bash(npm:*), Bash(node:*)
description: Update all HTML dashboards - regenerates activity dashboard, fetches open PRs, captures kanban snapshot, and generates all three HTML reports
argument-hint: (no arguments needed)
---

# Update All Dashboards

Comprehensive update command that refreshes all three HTML dashboards in a single operation.

## What It Does

1. **Regenerates GitHub Activity Dashboard** from existing week data
2. **Fetches current open PRs** from all tracked repositories
3. **Captures kanban snapshot** from GitHub Projects V2
4. **Generates all three HTML files**:
   - `dashboard.html` - Team activity metrics
   - `open-prs.html` - Current open pull requests
   - `kanban-dashboard.html` - Kanban board workload

## Usage

```
/update-all
```

This is equivalent to running:
```bash
npm run dashboard
npm run open-prs
npm run kanban
```

## Output Files

- **dashboard.html** - GitHub activity dashboard with commits, PRs, and line changes
- **open-prs.html** - Open pull requests with age tracking and labels
- **kanban-dashboard.html** - Kanban board snapshot with task distribution

## Examples

### Update all dashboards
```
/update-all
```

Runs the full update sequence and generates all three HTML files.

### View dashboards after update
```bash
open dashboard.html           # GitHub activity
open open-prs.html           # Open PRs
open kanban-dashboard.html   # Kanban board
```

## What Gets Updated

| Dashboard | Data Source | Action |
|-----------|-------------|--------|
| `dashboard.html` | Existing week JSON files | Regenerated from cache |
| `open-prs.html` | GitHub API (live fetch) | Fresh PR data |
| `kanban-dashboard.html` | GitHub Projects V2 (live fetch) | New snapshot |

## Duration

Typically takes 10-30 seconds depending on:
- Number of open PRs across repositories
- Size of kanban boards
- GitHub API response time

## Requirements

- Node.js >= 18.0.0
- GitHub Personal Access Token with `repo` scope
- GITHUB_TOKEN environment variable configured in `.env`

## Troubleshooting

**Command fails with "GITHUB_TOKEN not found"**
- Ensure `.env` file exists in project root
- Verify it contains `GITHUB_TOKEN=ghp_your_token_here`

**Rate limiting errors**
- The system respects GitHub's 5,000 requests/hour limit
- Wait a few minutes if approaching the limit
- Individual commands can be run separately if needed

**Dashboard not generating**
- Check console output for specific error messages
- Verify write permissions to project directory
- Ensure `github-data/` and `kanban/` directories exist
