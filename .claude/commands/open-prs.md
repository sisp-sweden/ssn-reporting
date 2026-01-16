---
allowed-tools: Bash(npm:*), Bash(node:*)
description: Fetch all open pull requests from tracked repositories and generate an interactive HTML dashboard showing PR details, authors, labels, reviewers, and age.
argument-hint: (no arguments needed)
---

# Open PRs Dashboard

Fetch all currently open pull requests from the 7 tracked SSN repositories and generate an interactive HTML dashboard.

## What It Does

1. **Fetches open PRs** from all tracked repositories via GitHub API
2. **Extracts extended information** including:
   - PR title and number
   - Author
   - Labels
   - Requested reviewers
   - Draft status
   - Age (how long the PR has been open)
3. **Generates interactive HTML** with sortable columns and statistics
4. **Saves dashboard** to `open-prs.html` in the project root

## Usage

```
/open-prs
npm run open-prs
node src/index.js --open-prs
```

## Tracked Repositories

- sisp-sweden/ssn-admin
- sisp-sweden/ssn-web
- sisp-sweden/ssn-etl
- sisp-sweden/ssn-database
- sisp-sweden/ssn-agentic-layer
- sisp-sweden/ssn-dashboard
- sisp-sweden/ssn-developer-onboarding

## Dashboard Features

### Overview Cards
- Total open PRs
- Number of unique authors
- Repositories with open PRs
- Oldest PR age
- Draft PR count
- PRs awaiting review

### PR Table
Sortable columns for:
- Repository
- Author
- Title (with PR number and draft indicator)
- Labels (color-coded)
- Requested reviewers
- Age (color-coded: green = new, yellow = moderate, red = old)

### Navigation
Shared menu linking to:
- Activity Dashboard (dashboard.html)
- Kanban Board (kanban-dashboard.html)
- Open PRs (open-prs.html)

## Output File

**Location:** `open-prs.html`

Interactive HTML report with:
- Green gradient header (distinct from other dashboards)
- Responsive design for mobile/desktop
- Sortable table columns
- Direct links to each PR on GitHub
- Print-friendly styling

## Examples

### Quick update
```
/open-prs
```
Fetches current open PRs and regenerates the dashboard.

### View dashboard
After running, open `open-prs.html` in any web browser:
```bash
open open-prs.html      # macOS
start open-prs.html     # Windows
xdg-open open-prs.html  # Linux
```

## Age Color Coding

- **Green**: Less than 3 days old (fresh PRs)
- **Yellow**: 3-7 days old (moderate age)
- **Red**: More than 7 days old (needs attention)

## Requirements

- Node.js >= 18.0.0
- GitHub Personal Access Token with `repo` scope
- GITHUB_TOKEN environment variable configured in `.env`

## Troubleshooting

**No PRs showing**
- Verify GITHUB_TOKEN is set in .env
- Check that repositories are accessible with your token
- Confirm there are actually open PRs in the repositories

**Rate limiting**
- The system respects GitHub's rate limits
- Will automatically wait if approaching the limit
- Authenticated requests have 5,000/hour limit

**Dashboard not generating**
- Check console for error messages
- Verify write permissions to project directory
