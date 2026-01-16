# SSN GitHub Reporting System

Automated GitHub data collection system for SSN development team. Collects metrics about commits, pull requests, and code changes across 7 repositories on a weekly basis.

## Features

- **Automatic Data Collection**: Fetches commits, PRs, and line changes from GitHub
- **Weekly Aggregation**: Groups metrics by ISO week (Monday-Sunday)
- **Per-User Metrics**: Tracks individual contributor activity
- **Daily & Weekly Totals**: Provides both granular and high-level statistics
- **Idempotent Operation**: Safe to re-run without duplicating data
- **Rate Limit Handling**: Automatically handles GitHub API rate limits
- **JSON Output**: Structured, queryable data format

## Tracked Repositories

1. sisp-sweden/ssn-admin
2. sisp-sweden/ssn-web
3. sisp-sweden/ssn-etl
4. sisp-sweden/ssn-database
5. sisp-sweden/ssn-agentic-layer
6. sisp-sweden/ssn-dashboard
7. sisp-sweden/ssn-developer-onboarding

## Metrics

For each user, the system tracks:

- **Commits**: Number of commits per day/week
- **Pull Requests**: Number of PRs created per day/week
- **Lines Added**: Total new lines of code
- **Lines Deleted**: Total removed lines of code

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- GitHub Personal Access Token

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd ssn-reporting
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your GitHub token:
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

To create a GitHub token:
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scope: `repo` (full control of private repos)
4. Generate and copy the token
5. Paste into `.env` file

## Usage

### Option 1: Local Execution (Development)

**Run the collector for current week:**

```bash
npm start
```

This will:
1. Determine the current ISO week
2. Check if data already exists
3. Fetch missing data from GitHub
4. Save to `github-data/YYYY-WW.json`
5. Display summary statistics

**Development mode (with auto-reload):**

```bash
npm run dev
```

### Option 2: GitHub Actions (Automated/Cloud)

For automated execution without exposing your token:

1. **Setup** (one-time): Follow [.github/SETUP.md](.github/SETUP.md) to configure GitHub Secrets
2. **Automatic runs**: Workflows run on schedule (weekly/daily)
3. **Manual trigger from Claude Cloud**:
   ```bash
   gh workflow run weekly-report.yml
   gh workflow run update-dashboards.yml
   ```

**Benefits**:
- ✅ No token exposed to Claude Cloud
- ✅ Runs on GitHub's infrastructure
- ✅ Automatic scheduling
- ✅ Download results as artifacts

See [GitHub Actions Setup Guide](.github/SETUP.md) for details.

## Output Format

Data is saved to `github-data/YYYY-WW.json` where:
- `YYYY` = 4-digit year (e.g., 2025)
- `WW` = 2-digit ISO week number (01-53)

Example: `github-data/2025-52.json`

### JSON Structure

```json
{
  "week": "2025-52",
  "weekStart": "2025-12-16",
  "weekEnd": "2025-12-22",
  "generatedAt": "2025-12-23T10:30:00.000Z",
  "repositories": [
    "sisp-sweden/ssn-admin",
    "sisp-sweden/ssn-web"
  ],
  "users": {
    "johndoe": {
      "daily": {
        "2025-12-16": {
          "commits": 5,
          "prs": 2,
          "linesAdded": 120,
          "linesDeleted": 45
        },
        "2025-12-17": {
          "commits": 8,
          "prs": 1,
          "linesAdded": 245,
          "linesDeleted": 89
        }
      },
      "weekly": {
        "commits": 26,
        "prs": 4,
        "linesAdded": 719,
        "linesDeleted": 241
      }
    },
    "janedoe": {
      "daily": {
        "2025-12-16": {
          "commits": 3,
          "prs": 1,
          "linesAdded": 78,
          "linesDeleted": 12
        }
      },
      "weekly": {
        "commits": 3,
        "prs": 1,
        "linesAdded": 78,
        "linesDeleted": 12
      }
    }
  }
}
```

## How It Works

### Week Calculation

Uses ISO 8601 standard:
- Week 1 is the week containing January 4th
- Week starts on Monday (day 1)
- Week ends on Sunday (day 7)

Example: December 16-22, 2025 = Week 52 of 2025

### Data Collection Flow

1. **Check existing data** - If file for current week exists, loads it
2. **Identify missing dates** - Determines which dates in the week need data
3. **Fetch commits** - Queries GitHub API for commits in missing date range
4. **Fetch PRs** - Queries GitHub API for pull requests
5. **Parse diffs** - Extracts line change statistics from commits
6. **Aggregate** - Groups metrics by user and date
7. **Merge** - Combines with existing data (preserving what's already there)
8. **Calculate totals** - Computes weekly summary statistics
9. **Save** - Writes JSON file to `github-data/`

### Idempotent Operation

The system is designed to be safely re-run:
- Existing data is never overwritten
- Re-running fills in any missing days
- Multiple runs produce identical results
- File backups are created before updates

## Configuration

### Tracked Repositories

Edit `src/config/repositories.js` to change which repositories are tracked:

```javascript
export const repositories = [
  { owner: 'sisp-sweden', repo: 'repo-name' },
  // ... more repos
];
```

### Output Directory

Default: `C:\dev\ssn-reporting\github-data`

Change in `src/config/repositories.js`:
```javascript
export const outputDirectory = 'C:\\path\\to\\your\\directory';
```

## API Rate Limits

GitHub allows:
- **5,000 requests/hour** (authenticated with token)
- **60 requests/hour** (unauthenticated)

The system:
- Checks remaining requests before each batch
- Automatically waits if approaching limit
- Displays warnings when rate limit is low
- Shows remaining quota after completion

## Troubleshooting

### "GITHUB_TOKEN not found in .env file"

Make sure you've created a `.env` file with your token. The file should be in the project root:
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

### "Repository not found"

The token may not have access to the repository. Make sure:
- Token scope includes `repo`
- Repository is accessible to your GitHub account
- Repository name and owner are correct in config

### "Rate limit approaching"

The system will automatically wait for the rate limit to reset. This may take up to 1 hour. You can:
- Wait for the reset time
- Use a new token with higher limits
- Reduce the number of tracked repositories

### No data collected

Check:
1. Is the repository name and owner correct?
2. Do the repositories have any commits in the specified date range?
3. Is the GitHub token valid and has proper permissions?
4. Are you within the rate limit?

## File Structure

```
ssn-reporting/
├── .env                    (your GitHub token - not committed)
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
├── CLAUDE.md              (project guidance)
├── src/
│   ├── index.js           (main entry point)
│   ├── config/
│   │   └── repositories.js (repository configuration)
│   ├── github/
│   │   ├── client.js      (GitHub API wrapper)
│   │   ├── commits.js     (commit fetching)
│   │   ├── pullRequests.js (PR fetching)
│   │   └── diffParser.js  (line change parsing)
│   ├── storage/
│   │   ├── fileManager.js (JSON file I/O)
│   │   └── dataAggregator.js (data merging and aggregation)
│   └── utils/
│       ├── weekCalculator.js (ISO week calculations)
│       └── dateUtils.js   (date utilities)
└── github-data/           (output directory)
    ├── 2025-52.json
    ├── 2025-51.json
    └── ...
```

## Future Enhancements

- Command-line arguments for specific weeks
- Backfill support for historical data
- Email reports
- HTML dashboard
- Issue tracking metrics
- Code review statistics
- Team-level aggregations
- Database storage
- Web UI

## Maintenance

### Regular Updates

Run the collector weekly to stay current:
- Manually: `npm start`
- Automated: Set up a cron job or GitHub Action

### Data Backups

JSON files are backed up before updates. Backups are created as:
- `github-data/YYYY-WW.json.backup`

### Cleaning Old Data

Old week files can be safely deleted if disk space is needed:
```bash
rm github-data/2024-*.json
```

## License

MIT

## Support

For issues or questions, refer to the project documentation or contact the SSN team.
