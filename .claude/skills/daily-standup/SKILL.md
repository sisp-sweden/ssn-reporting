---
name: Daily Standup Generator
description: Generate a short daily summary of your GitHub activity (commits, PRs raised, PRs reviewed) for Slack. Perfect for quick standup updates and team communication.
version: 1.0.0
author: SSN Development Team
tags: [github, reporting, standup, slack, productivity]
---

**IMPORTANT - Path Resolution:**
This skill is part of the SSN Reporting project and uses the project's CLI infrastructure. The skill directory is `.claude/skills/daily-standup/` within the project root.

# Daily Standup Generator

Generate compact, copy-paste-ready standup summaries of your GitHub activity across all tracked SSN repositories.

## What It Does

1. **Fetches commits** you authored on the specified date across all 8 tracked repos
2. **Fetches PRs** you opened that day
3. **Fetches PRs** you reviewed that day (with review comment counts)
4. **Fetches PR comments** you wrote (both review comments and discussion comments)
5. **Fetches issue comments** you wrote on GitHub Issues
6. **Outputs** a short, Slack-ready summary with bullet points and PR links

## Quick Start

```bash
# Run from anywhere in the project
/daily-standup                           # Today's activity
/daily-standup --date yesterday          # Yesterday's activity
/daily-standup --date 2026-02-11         # Specific date
```

## Usage Patterns

### Today's Activity (Default)
```bash
/daily-standup
```

### Yesterday's Activity
```bash
/daily-standup --date yesterday
```

### Relative Days
```bash
/daily-standup --date -1                 # 1 day ago
/daily-standup --date -3                 # 3 days ago
/daily-standup --date -7                 # 1 week ago
```

### Specific Dates
```bash
/daily-standup --date 2026-02-11         # YYYY-MM-DD format
/daily-standup --date 260211             # YYMMDD format
```

## CLI Usage (Alternative)

You can also run via npm or node directly:

```bash
# Via npm
npm run daily-standup

# Via node CLI
node src/index.js --daily-standup
node src/index.js --daily-standup --date yesterday
node src/index.js --daily-standup --date 2026-02-11
```

## Output Format

The output is formatted for easy copy-paste into Slack:

```
🔍 SSN GitHub Data Collector

Fetching activity for jonathanahlbom on 2026-02-12...

DS: 15 commits
• feat: add dashboard improvements (ssn-admin)
• fix: resolve API timeout issues (ssn-web)
• chore: update dependencies (ssn-etl)
...

2 PRs raised
• #320 feat: enhance reporting dashboard (ssn-admin)
• #144 fix: database connection pooling (ssn-database)

3 PRs reviewed (8 review comments)
• #315 refactor: clean up codebase (ssn-admin)
• #140 feat: add new metrics (ssn-database)
• #98 docs: update README (ssn-web)

5 PRs commented on
• #318 feat: new feature (ssn-web) — 3 comments
• #142 fix: bug fix (ssn-database) — 2 comments

2 issues commented on
• #245 bug: fix production issue (ssn-admin) — 4 comments
• #89 feature: new dashboard widget (ssn-dashboard) — 1 comment
```

## Tracked Repositories

The tool searches across all SSN repositories:
- sisp-sweden/ssn-admin
- sisp-sweden/ssn-web
- sisp-sweden/ssn-etl
- sisp-sweden/ssn-database
- sisp-sweden/ssn-agentic-layer
- sisp-sweden/ssn-dashboard
- sisp-sweden/ssn-developer-onboarding
- sisp-sweden/ignite-magic-2.0

## Requirements

### Environment Variables

Two environment variables must be set in your `.env` file:

1. **GITHUB_TOKEN** - GitHub Personal Access Token
   - Required for API authentication
   - Create at: https://github.com/settings/tokens
   - Needs `repo` or `public_repo` scope

2. **GITHUB_USERNAME** - Your GitHub login
   - Example: `jonathanahlbom`
   - Used to filter activity to your account

### Example .env Configuration

```env
GITHUB_TOKEN=ghp_your_token_here
GITHUB_USERNAME=jonathanahlbom
```

## Date Format Support

The `--date` parameter accepts multiple formats:

| Format | Example | Description |
|--------|---------|-------------|
| (none) | `/daily-standup` | Today's activity |
| `yesterday` | `--date yesterday` | Yesterday's activity |
| Relative days | `--date -3` | N days ago (negative number) |
| YYYY-MM-DD | `--date 2026-02-11` | ISO date format |
| YYMMDD | `--date 260211` | Short date format |

## Common Use Cases

### Morning Standup Preparation
```bash
# Get yesterday's work for today's standup
/daily-standup --date yesterday
```

### End-of-Day Review
```bash
# Check what you accomplished today
/daily-standup
```

### Weekly Retrospective
```bash
# Review each day of the week
/daily-standup --date -5  # Monday
/daily-standup --date -4  # Tuesday
/daily-standup --date -3  # Wednesday
/daily-standup --date -2  # Thursday
/daily-standup --date -1  # Friday
```

### Fill in Missing Standup
```bash
# You forgot to post standup last Tuesday
/daily-standup --date 2026-02-09
```

## Implementation Details

The skill is a lightweight wrapper around the SSN Reporting CLI. It:

1. Validates that required environment variables are set
2. Parses the date parameter into a standard format
3. Fetches commits using GitHub's REST API
4. Fetches PRs opened by the user
5. Fetches PRs reviewed by the user
6. Formats output for Slack with bullet points and repository names

The implementation leverages:
- `src/dailySummary.js` - Main logic for fetching and formatting activity
- `src/github/client.js` - GitHub API client with rate limiting
- `src/config/repositories.js` - List of tracked repositories

### Activity Types Explained

The tool tracks several distinct types of GitHub activity:

**PR Reviews:**
- Shows PRs where you submitted a review (approved, requested changes, or commented)
- Includes total count of review comments made during reviews
- Review comments include: review body text + inline code comments

**PR Comments:**
- General discussion comments on PRs (not part of a formal review)
- Shown separately from reviews with comment counts per PR

**Issue Comments:**
- Comments on GitHub Issues (not PRs)
- Shown with comment counts per issue
- Only tracks issues, not pull requests

## Error Handling

The skill handles common errors gracefully:

- **Missing GITHUB_TOKEN**: Clear error message with setup instructions
- **Missing GITHUB_USERNAME**: Prompts to add username to .env
- **Invalid date format**: Shows supported date formats
- **GitHub API rate limit**: Automatically waits and retries
- **Network errors**: Displays error and suggests retry

## Tips

- **Copy to Slack**: Select the output text and paste directly into Slack
- **Weekend activity**: If you worked on weekends, you can fetch that activity too
- **No activity**: If you had no activity on a date, the tool will show "0 commits, 0 PRs"
- **Multiple accounts**: If you have multiple GitHub accounts, make sure GITHUB_USERNAME matches the account with SSN access

## Troubleshooting

### "Error: GITHUB_TOKEN not found"
Add your GitHub token to `.env`:
```env
GITHUB_TOKEN=ghp_your_token_here
```

### "Error: GITHUB_USERNAME not found"
Add your GitHub username to `.env`:
```env
GITHUB_USERNAME=your-github-username
```

### "No activity found"
This can mean:
- You didn't commit/PR on that date (expected)
- Your GitHub username is incorrect in `.env`
- The date format is invalid

### "API rate limit exceeded"
Wait for the rate limit to reset (shown in error message) or the tool will automatically wait.

## Example Workflow

```bash
# Monday morning - get Friday's work for standup
$ /daily-standup --date -3

🔍 SSN GitHub Data Collector

Fetching activity for jonathanahlbom on 2026-02-06...

DS: 8 commits
• feat: implement user authentication (ssn-admin)
• fix: resolve routing issue (ssn-web)
• test: add unit tests for auth (ssn-admin)
...

1 PRs raised
• #310 feat: add authentication system (ssn-admin)

2 PRs reviewed
• #305 refactor: clean up API (ssn-web)
• #135 feat: add metrics (ssn-database)

# Copy output to Slack
# Paste in standup channel
```

## Integration with Other Skills

This skill works well with other SSN reporting tools:

- Use `/ssn-report` for weekly aggregated metrics
- Use `/open-prs` to see all open PRs across repos
- Use `/kanban-snapshot` for project board status
- Use `/daily-standup` for daily personal activity

## Notes

- Activity is fetched in real-time from GitHub (not from cached weekly data)
- All timestamps use UTC timezone
- Private repositories require appropriate token permissions
- The tool respects GitHub API rate limits
