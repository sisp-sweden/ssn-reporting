---
allowed-tools: Bash(npm:*), Bash(node:*)
description: Send weekly email report with GitHub activity summary to configured recipients via Resend.
argument-hint: [--week current|last|YYYY-WW]
---

# Send Weekly Email Report

Send a weekly email report summarizing the team's GitHub activity (commits, PRs, line changes) with week-over-week comparison.

## What It Does

1. **Loads week data** from existing `github-data/YYYY-WW.json` files
2. **Loads previous week** data for trend comparison
3. **Generates email** with executive summary and individual performance table
4. **Sends via Resend** to the configured recipient

## Usage

```
/send-email
/send-email --week last
/send-email --week 2025-06
```

Or via CLI:

```bash
npm run send-email
node src/index.js --send-email --week current
node src/index.js --send-email --week last
node src/index.js --send-email --week 2025-06
```

## Requirements

- `RESEND_API_KEY` environment variable (required)
- `EMAIL_FROM` environment variable (optional, defaults to `SSN Reports <reports@swedenstartupnext.se>`)
- `EMAIL_TO` environment variable (optional, defaults to `jonathan.ahlbom@sisp.se`)
- Week data must already be collected (run `/ssn-report` first if needed)

## Email Content

### Executive Summary
- 2x2 metric grid: Commits, PRs, Lines Added, Lines Deleted
- Week-over-week trend arrows and percentages
- Active contributor count

### Individual Performance Table
- Each team member's stats sorted by activity
- Trend indicators per metric
- Bot accounts filtered out

## Troubleshooting

**"No data found for week"**
- Run data collection first: `npm start` or `/ssn-report`

**"RESEND_API_KEY environment variable is required"**
- Add `RESEND_API_KEY=re_xxxxx` to your `.env` file

**Email not arriving**
- Check Resend dashboard for delivery status
- Verify the FROM domain is configured in Resend
