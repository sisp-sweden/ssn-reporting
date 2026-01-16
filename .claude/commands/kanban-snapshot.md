---
allowed-tools: Bash(npm:*), Bash(node:*)
description: Capture daily kanban board snapshot from GitHub Projects and generate workload dashboard. Tracks task distribution across team members by column state (backlog, ready, in progress, in review, done).
argument-hint: [--date YYYY-MM-DD] [--generate-kanban-dashboard]
---

# Kanban Snapshot

Capture a snapshot of all kanban boards from GitHub Projects V2 across 6 tracked repositories and generate a workload distribution dashboard showing task assignment per person.

## What It Does

1. **Collects kanban data** from GitHub Projects V2 in 6 repositories
2. **Tracks task assignment** by person across 5 column states
3. **Saves daily snapshots** as JSON files for historical tracking
4. **Generates HTML dashboard** with per-person task breakdown and visualizations

## Tracked Repositories

- sisp-sweden/ssn-web
- sisp-sweden/ssn-admin
- sisp-sweden/ssn-agentic-layer
- sisp-sweden/ssn-database
- sisp-sweden/ssn-dashboard
- sisp-sweden/ssn-etl

## Column States

The system maps GitHub project columns to these standardized states:

- **Backlog** - Not started, planned work
- **Ready** - Approved and ready to start
- **In Progress** - Currently being worked on
- **In Review** - Completed, awaiting review/testing
- **Done** - Completed and closed

## Usage

### Capture today's snapshot with dashboard
```
/kanban-snapshot
npm run kanban
```

### Specify a different date
```
/kanban-snapshot --date 2025-12-20
node src/index.js --kanban-snapshot --date 2025-12-20 --generate-kanban-dashboard
```

### Generate dashboard only (no snapshot)
```
/kanban-snapshot --generate-kanban-dashboard
npm run kanban-dashboard
```

## Supported Flags

### `--date <YYYY-MM-DD>`
Specify the date for the snapshot. Default: today's date.

**Example:**
```
/kanban-snapshot --date 2025-12-20
```

### `--generate-kanban-dashboard`
Generate or regenerate the kanban dashboard HTML after capturing the snapshot. If used alone (without `--kanban-snapshot`), generates the dashboard from existing snapshots.

**Example:**
```
/kanban-snapshot --generate-kanban-dashboard
/kanban-snapshot --date 2025-12-20 --generate-kanban-dashboard
```

## Output Files

### Daily Snapshots
**Location:** `kanban/YYYY-MM-DD.json`

Contains:
- Date and generation timestamp
- All repositories scanned
- Project metadata
- Per-user task counts by column
- Raw item details for debugging

### Dashboard
**Location:** `kanban-dashboard.html`

Interactive HTML report with:
- Metric cards (total tasks, team size, in progress count, completed)
- Per-person task breakdown table
- Column distribution chart (pie chart)
- Workload distribution chart (top 10 people)
- Responsive design for mobile/desktop
- Print-friendly

## Examples

### Daily workflow
```bash
# Capture today's snapshot with dashboard
npm run kanban

# Check the generated dashboard
open kanban-dashboard.html
```

### Weekly backfill
```bash
# Capture multiple days
/kanban-snapshot --date 2025-12-20
/kanban-snapshot --date 2025-12-21
/kanban-snapshot --date 2025-12-22

# Generate consolidated dashboard
npm run kanban-dashboard
```

### Dashboard regeneration
If you want to regenerate the dashboard without collecting new data:
```bash
npm run kanban-dashboard
```

## Metrics Explained

### Per-Person Breakdown
Shows how many tasks each person has assigned in each column:
- **Backlog** (gray) - Planned but not started
- **Ready** (blue) - Approved and ready
- **In Progress** (yellow) - Currently working
- **In Review** (orange) - Done, waiting for review
- **Done** (green) - Completed

### Column Distribution
Pie chart showing the overall distribution of work across columns.

### Workload Distribution
Bar chart showing the top 10 busiest team members and their total task count.

## Error Handling

The system gracefully handles:
- **Repositories without projects** - Logs info and skips
- **Projects without Status field** - Logs error and skips project
- **Unmapped columns** - Maps to "backlog" with warning
- **Unassigned tasks** - Tracked separately
- **Rate limiting** - Automatic wait with user notification
- **Missing GitHub token** - Clear error message

## Data Privacy

Snapshots contain:
- GitHub usernames (from assignees)
- Issue/PR titles and numbers
- Column assignments
- Timestamp information

All data is stored locally in the `kanban/` directory.

## Tips

- Run snapshots at consistent times (e.g., end of day) for reliable comparisons
- Save dashboard after each snapshot for weekly/monthly reviews
- Use historical snapshots to track workload trends
- Unassigned tasks are tracked separately - monitor them regularly

## Troubleshooting

**No data collected**
- Ensure GITHUB_TOKEN is set in .env
- Verify repositories are accessible with the token
- Check that projects exist in the repositories

**Missing columns**
- Ensure projects use a "Status" field
- Check column names - they'll be mapped to standard states
- Unmapped columns default to "backlog"

**Dashboard not generating**
- Ensure `kanban/` directory has snapshot files
- Check file permissions
- Verify Chart.js CDN is accessible

## Requirements

- Node.js >= 18.0.0
- GitHub Personal Access Token with `repo` scope
- GITHUB_TOKEN environment variable configured in `.env`
