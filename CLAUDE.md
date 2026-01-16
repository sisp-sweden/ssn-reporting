# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SSN GitHub Reporting System is an automated data collection tool that fetches GitHub metrics (commits, pull requests, line changes) from 7 repositories and generates weekly aggregated reports. The system runs on a weekly cycle, collects per-user and per-day metrics, and outputs JSON files organized by ISO week number.

## Architecture

The system is organized into 5 functional layers:

- **Entry Point** (`src/index.js`) - Orchestrates the collection workflow, determines current week, loads/saves data
- **GitHub Integration** (`src/github/`) - API client with rate limiting, commit/PR fetching, diff parsing
- **Data Storage** (`src/storage/`) - File I/O (JSON), data aggregation, merging with existing data
- **Utilities** (`src/utils/`) - ISO week calculations, date manipulation
- **Configuration** (`src/config/`) - Repository list, output directory, project settings

### Data Flow

1. **Input**: Determine current ISO week → Check for existing data
2. **Collection**: Fetch commits and PRs from GitHub API for missing dates
3. **Parsing**: Extract line change statistics from commit diffs
4. **Aggregation**: Group metrics by user and date
5. **Merging**: Combine new data with existing (idempotent, never overwrites)
6. **Output**: Save as `github-data/YYYY-WW.json` (e.g., `2025-52.json`)

### Key Design Patterns

- **Idempotent Operations**: Safe to re-run; existing data is never overwritten, only supplemented
- **Rate Limit Handling**: Built-in detection and automatic wait when approaching GitHub's 5,000 req/hour limit
- **Incremental Collection**: Only fetches data for missing dates within a week
- **Deep Merge Strategy**: Preserves existing user/date entries while adding new ones

## Build and Development Commands

```bash
# Install dependencies
npm install

# Run data collection for current week
npm start

# Development mode with auto-reload on file changes
npm run dev

# Lint code with ESLint
npm run lint

# Format code with Prettier
npm run format

# Generate HTML dashboard from existing data
npm run dashboard

# Interactive backfill mode to fetch missing weeks
npm run backfill

# Fetch open PRs and generate dashboard
npm run open-prs

# Capture kanban snapshot and generate dashboard
npm run kanban
```

## CLI Features and Flags

The system supports multiple command-line arguments for flexible data collection and reporting:

### `--week <value>` - Specify Week
Determines which week to collect data for. Supports multiple formats:
- `current` or default - Current ISO week
- `last` - Previous ISO week
- `YYYY-WW` - ISO week format (e.g., `2025-52`)
- `YYYY-MM-DD` - Any date in the week (e.g., `2025-12-23`)

**Examples:**
```bash
node src/index.js --week 2025-52
node src/index.js --week 2025-12-23
node src/index.js --week last
```

### `--force` - Force Refresh
Re-fetch data even if the week already has complete data. Without this flag, the system only fetches data for missing dates within a week.

**Examples:**
```bash
node src/index.js --force
node src/index.js --week current --force
```

### `--backfill` - Interactive Missing Weeks Detection
Enter interactive mode to detect and backfill missing weeks from project start to current:
1. Scans `github-data/` directory for existing files
2. Detects gaps in the week sequence
3. Displays missing weeks with date ranges
4. Prompts user to select which weeks to fetch (comma-separated numbers, "all", or "q" to quit)
5. Shows confirmation with API cost estimate
6. Sequentially fetches selected weeks with progress indicators
7. Logs any errors but continues with remaining weeks

**Example:**
```bash
npm run backfill
# or
node src/index.js --backfill
```

### `--generate-dashboard` - HTML Report Generation
Generates or regenerates an interactive HTML dashboard from all existing week data:
- **Overview cards** - Team metrics (commits, PRs, lines changed) with trend indicators
- **Multi-week comparison table** - Historical data with week-over-week % changes (color-coded)
- **Trend charts** - Line and bar charts showing metrics over time (Chart.js)
- **Leaderboards** - Top 10 contributors by commits, PRs, and lines changed
- **Responsive design** - Works on desktop, tablet, and mobile
- **Print-friendly** - Can be printed to PDF
- **Self-contained** - Single HTML file, no server needed, opens directly in browser

The dashboard is saved to `dashboard.html` in the project root.

**Examples:**
```bash
npm run dashboard
node src/index.js --generate-dashboard
node src/index.js --week current --generate-dashboard  # Fetch + generate
```

### `--open-prs` - Open Pull Requests Dashboard
Fetches all currently open pull requests from the 7 tracked repositories and generates an interactive HTML dashboard:
- **Overview cards** - Total PRs, unique authors, repos with PRs, oldest PR age, draft count, awaiting review
- **PR table** - Repository, author, title, labels, requested reviewers, age
- **Age color coding** - Green (< 3 days), Yellow (3-7 days), Red (> 7 days)
- **Direct links** - Click any PR to open it on GitHub

The dashboard is saved to `open-prs.html` in the project root.

**Examples:**
```bash
npm run open-prs
node src/index.js --open-prs
```

### `--kanban-snapshot` - Kanban Board Snapshot
Captures a daily snapshot of the kanban board from GitHub Projects.

**Examples:**
```bash
npm run kanban
node src/index.js --kanban-snapshot
node src/index.js --kanban-snapshot --date 2025-01-08
```

### `--generate-kanban-dashboard` - Kanban Dashboard Generation
Generates the kanban workload dashboard from existing snapshots.

**Examples:**
```bash
npm run kanban-dashboard
node src/index.js --generate-kanban-dashboard
```

## GitHub Token Configuration

The system requires a GitHub Personal Access Token to authenticate API requests. The token can be provided in two ways:

### Option 1: Environment Variable (Recommended)
```bash
# Windows (Command Prompt)
set GITHUB_TOKEN=ghp_your_token_here
npm start

# Windows (PowerShell)
$env:GITHUB_TOKEN = "ghp_your_token_here"
npm start

# macOS/Linux
export GITHUB_TOKEN=ghp_your_token_here
npm start
```

### Option 2: .env File
Create a `.env` file in the project root:
```
GITHUB_TOKEN=ghp_your_token_here
```

The `.env` file will be automatically loaded when running commands via npm scripts.

To create a token:
1. Go to https://github.com/settings/tokens
2. Create a new Personal Access Token with `repo` or `public_repo` scope
3. Copy the token and use it as shown above

## Backfill Strategies and Known Limitations

### Direct Week Specification (Recommended for Scripting)
For reliable, non-interactive backfilling, use direct week specification:

```bash
# Fetch specific weeks by ISO week number
node src/index.js --week 2025-49 --force
node src/index.js --week 2025-50 --force

# Or fetch by date (any date within the desired week)
node src/index.js --week 2025-12-01 --force
node src/index.js --week 2025-12-08 --force
```

**Advantages:**
- No interactive prompts to manage
- Can be easily scripted or automated
- Full control over which weeks to fetch
- Better for headless/non-interactive environments

### Interactive Backfill Mode (Limitations)
The `npm run backfill` command uses interactive prompts and has known limitations:

```bash
npm run backfill
# or
node src/index.js --backfill
```

**Known Issues:**
- Interactive stdin prompts don't always accept piped input properly
- May not work reliably in non-interactive shells or CI/CD environments
- Consider using direct week specification for automation

### Recommended Backfill Workflow

For fetching multiple weeks from a date range:
```bash
# Export token once
export GITHUB_TOKEN=ghp_your_token_here

# Fetch consecutive weeks
node src/index.js --week 2025-49 --force  # Dec 1-7
node src/index.js --week 2025-50 --force  # Dec 8-14
node src/index.js --week 2025-51 --force  # Dec 15-21
node src/index.js --week current          # Current week (only missing dates)
```

Or combine with the dashboard generation in one command:
```bash
node src/index.js --week 2025-49 --force && npm run dashboard
```

## Claude Code Slash Commands

Three slash commands are available in `.claude/commands/` for easy invocation:

### `/ssn-report` - GitHub Activity Data Collection
Fetches commits, PRs, and code metrics from tracked repositories.

```bash
/ssn-report                                    # Current week
/ssn-report --week last                        # Previous week
/ssn-report --week 2025-52                     # Specific ISO week
/ssn-report --week 2025-12-23                  # Week containing date
/ssn-report --force                            # Re-fetch all data
/ssn-report --generate-dashboard               # Generate HTML dashboard
/ssn-report --backfill                         # Interactive missing weeks
/ssn-report --week current --force --generate-dashboard  # Combined
```

**Output:** `github-data/YYYY-WW.json` and `dashboard.html`

### `/kanban-snapshot` - Kanban Board Tracking
Captures daily snapshots from GitHub Projects V2 and generates workload dashboard.

```bash
/kanban-snapshot                               # Today's snapshot + dashboard
/kanban-snapshot --date 2025-12-20             # Specific date
/kanban-snapshot --generate-kanban-dashboard   # Dashboard only (no fetch)
```

**Output:** `kanban/YYYY-MM-DD.json` and `kanban-dashboard.html`

**Tracked columns:** Backlog → Ready → In Progress → In Review → Done

### `/open-prs` - Open Pull Requests Dashboard
Fetches all open PRs and generates interactive dashboard with age tracking.

```bash
/open-prs                                      # Fetch and generate
```

**Output:** `open-prs.html`

**Features:**
- Overview cards (total PRs, authors, repos, oldest age, drafts, awaiting review)
- PR table with labels, reviewers, and age color-coding
- Green (< 3 days) → Yellow (3-7 days) → Red (> 7 days)

## Week-over-Week Comparison

The system automatically calculates percentage changes between consecutive weeks:

- **Positive changes** - Green indicators (↑ X%)
- **Negative changes** - Red indicators (↓ X%)
- **New contributors** - Yellow "NEW" label (no prior week data)
- **Inactive contributors** - Noted when activity drops to zero
- **Edge cases** - Handles division by zero (infinity cases marked as "NEW")

Comparisons are integrated into:
- HTML dashboard (tables and trend cards)
- Leaderboards and metrics displays

## Report Generation Architecture

### New Modules (Steps 5-6)

**`src/reports/htmlTemplates.js`** - HTML template generation with inline CSS/JavaScript
- `generateDashboard(dashboardData)` - Complete dashboard generation
- `generateHeader()`, `generateOverviewCards()`, `generateComparisonTable()` - Section builders
- `generateTrendCharts()` - Chart.js integration for trend visualization
- `generateLeaderboards()` - Top contributor rankings
- `wrapInHTMLDocument()` - Complete HTML document with styling

**`src/reports/dashboardGenerator.js`** - Dashboard orchestration
- `generateDashboardHTML()` - Main orchestrator; loads all weeks, calculates stats, generates HTML
- `calculateTeamStats()` - Aggregate team-level metrics
- `buildLeaderboards()` - Top contributors analysis
- `calculateTrends()` - Week-over-week comparisons

**`src/reports/weekComparator.js`** - Week comparison logic
- `compareWeeks()` - Compare two weeks, returns detailed deltas
- `calculatePercentageChange()` - Handles edge cases (zero values, new contributors, etc.)

## Backfill and CLI Architecture

### New Modules (Steps 1, 2, 4)

**`src/cli/argumentParser.js`** - CLI argument parsing
- `parseArguments()` - Parse all CLI flags using commander.js
- `validateAndParseWeek()` - Convert week specs to {year, week}
- `describeWeek()` - Human-readable week description

**`src/cli/backfillManager.js`** - Interactive backfill workflow
- `detectMissingWeeks()` - Scan for gaps in week sequence
- `displayMissingWeeks()` - Formatted list display
- `promptUserSelection()` - Interactive selection with readline
- `confirmBackfill()` - Confirmation prompt before fetching
- `processBackfill()` - Sequential fetching with progress tracking
- `runBackfill()` - Main orchestrator

### Modified Entry Point

**`src/index.js`** - Refactored for CLI routing
- `runCLI()` - Main CLI orchestrator that routes based on arguments
- `fetchWeekData(year, week, forceRefresh)` - Extracted data collection logic
  - Validates GitHub token
  - Checks for existing data (unless force=true)
  - Fetches commits and PRs
  - Aggregates and merges data
  - Saves with automatic backup

**`src/storage/fileManager.js`** - Extended with bulk operations
- `getExistingWeeks()` - List all weeks with data
- `loadMultipleWeeks()` - Load multiple week files at once
- `getPreviousWeek()` - Get previous week number for comparisons

## Testing

Currently there are no automated tests. Consider adding:
- Unit tests for week calculation (`src/utils/weekCalculator.js`)
- Unit tests for data aggregation (`src/storage/dataAggregator.js`)
- Integration tests for the full collection workflow

## Key Files and Their Responsibilities

### Core Data Collection
- `src/index.js` - CLI orchestrator; routes to data fetch, backfill, or dashboard generation based on arguments
- `src/github/client.js` - GitHubClient class wrapping @octokit with rate limit awareness
- `src/github/commits.js` - Functions to fetch commits and aggregate stats by user/date
- `src/github/pullRequests.js` - Functions to fetch PRs and count by user/date
- `src/github/diffParser.js` - Parses diff strings to extract line addition/deletion counts
- `src/storage/dataAggregator.js` - Data structure builders and merge logic
- `src/storage/fileManager.js` - JSON file read/write with backup creation, bulk week operations
- `src/utils/weekCalculator.js` - ISO 8601 week calculations (critical for correct date ranges)
- `src/config/repositories.js` - List of 7 tracked sisp-sweden repos and output directory path

### CLI and Arguments
- `src/cli/argumentParser.js` - Command-line argument parsing using commander.js
- `src/cli/backfillManager.js` - Interactive backfill workflow with missing week detection

### Reporting and Dashboard
- `src/reports/dashboardGenerator.js` - Main dashboard orchestrator; loads weeks, calculates stats, generates HTML
- `src/reports/htmlTemplates.js` - HTML/CSS/JavaScript template generation for dashboard
- `src/reports/weekComparator.js` - Week-over-week comparison and percentage change calculations

### Open PRs
- `src/openPrs/openPrsCollector.js` - Fetches open PRs from all repositories, calculates age and stats
- `src/openPrs/openPrsHtmlGenerator.js` - Generates the open-prs.html dashboard

### Kanban Tracking
- `src/kanban/snapshotCollector.js` - Collects kanban data from GitHub Projects V2
- `src/kanban/snapshotManager.js` - Manages snapshot file storage
- `src/kanban/columnMapper.js` - Maps project columns to standard states
- `src/kanban/aggregator.js` - Aggregates task counts by person and column
- `src/kanban/dashboardGenerator.js` - Generates kanban-dashboard.html
- `src/kanban/htmlTemplates.js` - HTML templates for kanban dashboard
- `src/github/projects.js` - GitHub Projects V2 API integration

### Slash Commands
- `.claude/commands/ssn-report.md` - `/ssn-report` command definition
- `.claude/commands/kanban-snapshot.md` - `/kanban-snapshot` command definition
- `.claude/commands/open-prs.md` - `/open-prs` command definition

## Important Implementation Details

### Week Calculations (src/utils/weekCalculator.js)

Uses ISO 8601 standard:
- Week 1 is the week containing January 4th
- Week starts on Monday, ends on Sunday
- The project primarily works with the current week, though data is persisted weekly

### Data Merge Logic (src/storage/dataAggregator.js)

The merge strategy is crucial for idempotency:
- Existing user/date entries are never modified
- New users and new dates are added
- Weekly totals are recalculated from all daily data
- This allows re-running the collector to fill in gaps without duplication

### GitHub API Constraints

- Rate limit: 5,000 requests/hour (authenticated)
- The client checks remaining quota before each batch
- Automatic wait with user warning if approaching limit
- Pagination uses `per_page: 100` to minimize requests

### Output File Format

JSON structure per `github-data/YYYY-WW.json`:
```json
{
  "week": "2025-52",
  "weekStart": "2025-12-16",
  "weekEnd": "2025-12-22",
  "generatedAt": "2025-12-23T10:30:00.000Z",
  "repositories": ["sisp-sweden/ssn-admin", ...],
  "users": {
    "username": {
      "daily": {
        "2025-12-16": { "commits": 5, "prs": 2, "linesAdded": 120, "linesDeleted": 45 }
      },
      "weekly": { "commits": 26, "prs": 4, "linesAdded": 719, "linesDeleted": 241 }
    }
  }
}
```


## CRITICAL: File Editing on Windows

### ⚠️ MANDATORY: Always Use Backslashes on Windows for File Paths

**When using Edit or MultiEdit tools on Windows, you MUST use backslashes (`\`) in file paths, NOT forward slashes (`/`).**

#### ❌ WRONG - Will cause errors:
```
Edit(file_path: "D:/repos/project/file.tsx", ...)
MultiEdit(file_path: "D:/repos/project/file.tsx", ...)
```

#### ✅ CORRECT - Always works:
```
Edit(file_path: "D:\repos\project\file.tsx", ...)
MultiEdit(file_path: "D:\repos\project\file.tsx", ...)
```


## CRITICAL: Always Use Existing CLI Commands

### ⚠️ MANDATORY: Never Write Inline Scripts for Existing Features

**This project uses ES modules (`"type": "module"` in package.json). ALWAYS use the existing CLI infrastructure instead of writing inline Node.js scripts.**

#### ❌ WRONG - Will cause errors:
```bash
# DO NOT write inline scripts with require() - they will fail!
node -e "const { Octokit } = require('@octokit/rest'); ..."

# DO NOT create temporary .js files with CommonJS syntax
# The project uses ES modules, so require() is not available
```

#### ✅ CORRECT - Always use existing commands:
```bash
# Use npm scripts (preferred)
npm run open-prs
npm run dashboard
npm run kanban
npm run backfill

# Or use node with the main entry point
node src/index.js --open-prs
node src/index.js --generate-dashboard
node src/index.js --kanban-snapshot
node src/index.js --generate-kanban-dashboard
node src/index.js --week 2025-02 --force
```

### Available npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `node src/index.js` | Run data collection for current week |
| `npm run dashboard` | `--generate-dashboard` | Generate activity dashboard HTML |
| `npm run open-prs` | `--open-prs` | Fetch open PRs and generate dashboard |
| `npm run kanban` | `--kanban-snapshot --generate-kanban-dashboard` | Capture kanban snapshot and generate dashboard |
| `npm run kanban-dashboard` | `--generate-kanban-dashboard` | Generate kanban dashboard from existing data |
| `npm run backfill` | `--backfill` | Interactive mode to fill missing weeks |

### Why This Matters

1. **ES Modules**: The project uses `"type": "module"`, so `require()` is not available
2. **Existing Infrastructure**: All features are already implemented in `src/` with proper ES module imports
3. **Rate Limiting**: The existing code handles GitHub API rate limits properly
4. **Error Handling**: The CLI has proper error handling and user feedback
5. **Consistency**: Using the CLI ensures consistent output formats and file locations
