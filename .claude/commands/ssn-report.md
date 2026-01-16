---
allowed-tools: Bash(npm:*), Bash(node:*)
description: Run SSN GitHub reporting system with options to collect data for a specific week, backfill missing data, force regeneration, or generate HTML dashboard. Supports --week (current/last/YYYY-WW/YYYY-MM-DD), --backfill, --force, and --generate-dashboard flags.
argument-hint: [--week current|last|YYYY-WW|YYYY-MM-DD] [--backfill] [--force] [--generate-dashboard]
---

# SSN Report Generator

Comprehensive GitHub data collection and reporting system for the SSN development team.

Fetches commits, pull requests, and code metrics from tracked repositories, aggregates them by user and date, and generates reports with week-over-week comparisons and leaderboards.

## Usage

```
/ssn-report [FLAGS]
```

## Supported Flags

### `--week <value>`
Specify which week to collect data for. Supports multiple formats:

- `current` - Current ISO week (default)
- `last` - Previous ISO week
- `YYYY-WW` - ISO week format (e.g., `2025-52`)
- `YYYY-MM-DD` - Any date in the week (e.g., `2025-12-23`)

**Example:**
```
/ssn-report --week 2025-52
/ssn-report --week 2025-12-23
/ssn-report --week last
```

### `--backfill`
Enter interactive mode to detect and fill missing weeks from the project start date to now.

Shows a list of missing weeks and prompts you to select which ones to fetch:
```
Missing Weeks:
  [1] 2025-50 (Dec 9 - Dec 15)
  [2] 2025-51 (Dec 16 - Dec 22)

Select weeks (comma-separated numbers, "all", or "q" to quit):
```

**Example:**
```
/ssn-report --backfill
```

Selects: `1,2` or `all` to backfill those weeks.

### `--force`
Force re-fetch all data for a week even if it already exists in the database.

Without this flag, the system skips dates where data is already collected. With `--force`, it re-fetches everything.

**Example:**
```
/ssn-report --week current --force
/ssn-report --week 2025-52 --force
```

### `--generate-dashboard`
Generate or regenerate the HTML dashboard from existing week data.

The dashboard includes:
- Overview cards with team metrics and trends
- Multi-week comparison table with week-over-week % changes
- Trend charts showing commits/PRs/lines changed over time
- Top contributor leaderboards (commits, PRs, lines changed)

Output: `dashboard.html` in the project root (can be opened in any browser)

**Example:**
```
/ssn-report --generate-dashboard
/ssn-report --week current --generate-dashboard
```

## Examples

### Current week (default)
```
/ssn-report
```
Fetches data for the current ISO week.

### Force refresh current week
```
/ssn-report --force
```
Re-fetches all data for the current week, replacing existing data.

### Specific week
```
/ssn-report --week 2025-52
```
Fetch data for ISO week 2025-52 (Dec 22-28, 2025).

### Date-based week
```
/ssn-report --week 2025-12-15
```
Determine ISO week for Dec 15, 2025, and fetch that week's data.

### Previous week with dashboard
```
/ssn-report --week last --generate-dashboard
```
Fetch last week's data and generate/update the dashboard.

### Interactive backfill
```
/ssn-report --backfill
```
Prompts to select missing weeks and backfill them interactively.

### Dashboard only
```
/ssn-report --generate-dashboard
```
Generate dashboard from existing data (no fetch).

### Combined operation
```
/ssn-report --week current --force --generate-dashboard
```
Force re-fetch current week and regenerate the dashboard.

## What It Does

1. **Data Collection**
   - Authenticates with GitHub using `GITHUB_TOKEN` from `.env`
   - Fetches commits and pull requests from configured repositories
   - Extracts line change statistics (+added, -deleted)
   - Aggregates metrics by user and date

2. **Data Storage**
   - Saves weekly data to `github-data/YYYY-WW.json`
   - Automatically backs up existing files before overwriting
   - Supports idempotent operations (safe to re-run)

3. **Report Generation**
   - Calculates team-level and user-level statistics
   - Computes week-over-week percentage changes
   - Generates interactive HTML dashboard
   - Creates leaderboards by commits, PRs, and code changes

## Tracked Repositories

- sisp-sweden/ssn-admin
- sisp-sweden/ssn-web
- sisp-sweden/ssn-etl
- sisp-sweden/ssn-database
- sisp-sweden/ssn-agentic-layer
- sisp-sweden/ssn-dashboard
- sisp-sweden/ssn-developer-onboarding

## Output Files

- **Weekly data**: `github-data/YYYY-WW.json`
  - Contains commits, PRs, and line changes by user and date

- **Dashboard**: `dashboard.html`
  - Interactive HTML report viewable in any web browser
  - No server needed - open directly from file system
  - Charts powered by Chart.js (CDN)

## Configuration

- **GitHub Token**: Set `GITHUB_TOKEN` in `.env` file
- **Repositories**: Edit `src/config/repositories.js`
- **Project Start Date**: Set in `src/config/repositories.js` for backfill

## Help

For more information or to see all available options:
```
/ssn-report --help
```

## Notes

- Respects GitHub API rate limits (waits if approaching limit)
- Data is fetched sequentially to avoid rate limit issues
- All dates use ISO 8601 week calendar (Monday = start of week)
- Dashboard updates are incremental - old dashboards can be regenerated
- Ideal for weekly team reporting and performance tracking
