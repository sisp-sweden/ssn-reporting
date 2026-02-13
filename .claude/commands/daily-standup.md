---
allowed-tools: Bash(npm:*), Bash(node:*)
description: Generate a short daily summary of your GitHub activity (commits, PRs raised, PRs reviewed) for Slack.
argument-hint: [--date YYYY-MM-DD]
---

> **Note:** This command has been upgraded to a full skill!
> See `.claude/skills/daily-standup/` for complete documentation, examples, and additional features.

# Daily Standup

Generate a compact standup summary of your GitHub activity for Slack.

## What It Does

1. **Fetches commits** you authored across all tracked repos
2. **Fetches PRs** you opened that day
3. **Fetches PRs** you reviewed that day (with review comment counts)
4. **Fetches PR comments** you wrote (review comments and discussion comments)
5. **Fetches issue comments** you wrote on GitHub Issues
6. **Outputs** a short, copy-paste-ready summary for Slack

## Usage

```
/daily-standup                           # Today
/daily-standup --date yesterday          # Yesterday
/daily-standup --date -1                 # 1 day ago
/daily-standup --date -3                 # 3 days ago
/daily-standup --date 260211             # YYMMDD format (Feb 11, 2026)
/daily-standup --date 2026-02-11         # YYYY-MM-DD format
```

Or via CLI:

```bash
npm run daily-standup
node src/index.js --daily-standup
node src/index.js --daily-standup --date 2026-02-11
```

## Requirements

- `GITHUB_TOKEN` environment variable
- `GITHUB_USERNAME` environment variable (your GitHub login, e.g. `jonathanahlbom`)

## Run the command now

```bash
node src/index.js --daily-standup
```
