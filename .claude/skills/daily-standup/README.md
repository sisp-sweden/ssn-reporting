# Daily Standup Generator Skill

A Claude Code skill for generating quick daily standup summaries from your GitHub activity.

## Overview

This skill provides a convenient way to generate Slack-ready standup updates by fetching your commits, PRs raised, PRs reviewed (with review comment counts), PR comments, and issue comments from GitHub across all SSN repositories.

## Installation

This skill is part of the SSN Reporting project and is automatically available when working in the project directory.

## Quick Reference

```bash
/daily-standup                    # Today
/daily-standup --date yesterday   # Yesterday
/daily-standup --date -3          # 3 days ago
/daily-standup --date 2026-02-11  # Specific date
```

## Requirements

Set these in your `.env` file:

```env
GITHUB_TOKEN=ghp_your_token_here
GITHUB_USERNAME=your-github-username
```

## Output Example

```
DS: 15 commits
• feat: add dashboard improvements (ssn-admin)
• fix: resolve API timeout issues (ssn-web)

2 PRs raised
• #320 feat: enhance reporting dashboard (ssn-admin)

3 PRs reviewed (8 review comments)
• #315 refactor: clean up codebase (ssn-admin)

5 PRs commented on
• #318 feat: new feature (ssn-web) — 3 comments

2 issues commented on
• #245 bug: fix production issue (ssn-admin) — 4 comments
```

## Date Formats

- **No argument**: Today
- `yesterday`: Yesterday
- `-N`: N days ago (e.g., `-3` = 3 days ago)
- `YYYY-MM-DD`: ISO date (e.g., `2026-02-11`)
- `YYMMDD`: Short format (e.g., `260211`)

## Tracked Repositories

- sisp-sweden/ssn-admin
- sisp-sweden/ssn-web
- sisp-sweden/ssn-etl
- sisp-sweden/ssn-database
- sisp-sweden/ssn-agentic-layer
- sisp-sweden/ssn-dashboard
- sisp-sweden/ssn-developer-onboarding
- sisp-sweden/ignite-magic-2.0

## Implementation

The skill uses the SSN Reporting CLI infrastructure:

- **Main Logic**: `src/dailySummary.js`
- **GitHub Client**: `src/github/client.js`
- **Configuration**: `src/config/repositories.js`
- **CLI Entry**: `src/index.js --daily-standup`

## Related Commands

- `/ssn-report` - Weekly aggregated metrics
- `/open-prs` - All open PRs dashboard
- `/kanban-snapshot` - Project board snapshot

## Troubleshooting

### Missing GITHUB_TOKEN
```env
GITHUB_TOKEN=ghp_your_token_here
```

### Missing GITHUB_USERNAME
```env
GITHUB_USERNAME=jonathanahlbom
```

### No Activity Found
- Check that the date is correct
- Verify your GitHub username in `.env`
- Confirm you had activity on that date

## Support

For issues or questions:
- Check the main [CLAUDE.md](../../../CLAUDE.md) documentation
- Review the [project README](../../../README.md)
- Examine `src/dailySummary.js` for implementation details
