# Daily Standup Examples

Real-world usage examples and common workflows.

## Basic Usage

### Today's Activity
```bash
/daily-standup
```

**Output:**
```
🔍 SSN GitHub Data Collector

Fetching activity for jonathanahlbom on 2026-02-12...

DS: 15 commits
• feat: add enhanced reporting (ssn-admin)
• fix: resolve database connection issue (ssn-database)
• chore: update dependencies (ssn-web)
• refactor: clean up API endpoints (ssn-etl)
...

2 PRs raised
• #320 feat: enhanced reporting dashboard (ssn-admin)
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

### Yesterday's Activity (Most Common)
```bash
/daily-standup --date yesterday
```

Perfect for preparing your morning standup about what you did the previous day.

## Relative Date Examples

### Last 3 Days (for Monday standup after weekend)
```bash
# Friday
/daily-standup --date -3

# Thursday
/daily-standup --date -4

# Wednesday
/daily-standup --date -5
```

### Last Week Review
```bash
# Review each day of last week
/daily-standup --date -7  # Last Monday
/daily-standup --date -6  # Last Tuesday
/daily-standup --date -5  # Last Wednesday
/daily-standup --date -4  # Last Thursday
/daily-standup --date -3  # Last Friday
```

## Specific Date Examples

### ISO Date Format (YYYY-MM-DD)
```bash
# Specific date in February 2026
/daily-standup --date 2026-02-11

# First day of the month
/daily-standup --date 2026-02-01

# End of last month
/daily-standup --date 2026-01-31
```

### Short Date Format (YYMMDD)
```bash
# February 11, 2026
/daily-standup --date 260211

# January 15, 2026
/daily-standup --date 260115
```

## Common Workflows

### Morning Standup Routine
```bash
# 1. Get yesterday's work
/daily-standup --date yesterday

# 2. Copy output to clipboard
# 3. Paste in Slack standup channel
# 4. Add "Today I plan to..." section manually
```

### Weekly Retrospective
```bash
# Review entire week (assuming today is Friday)
/daily-standup --date -4  # Monday
/daily-standup --date -3  # Tuesday
/daily-standup --date -2  # Wednesday
/daily-standup --date -1  # Thursday
/daily-standup             # Friday (today)
```

### Fill Missing Standup
```bash
# Oops, forgot to post standup for Tuesday Feb 9
/daily-standup --date 2026-02-09

# Copy output and post with note: "(Posted late - activity from Feb 9)"
```

### End-of-Day Review
```bash
# Before logging off, check what you accomplished
/daily-standup
```

## Edge Cases

### No Activity Day
```bash
/daily-standup --date 2026-02-10
```

**Output:**
```
🔍 SSN GitHub Data Collector

Fetching activity for jonathanahlbom on 2026-02-10...

DS: 0 commits

No PRs raised

No PRs reviewed
```

Use this to confirm you didn't work on a particular day (vacation, sick day, etc.)

### Weekend Work
```bash
# Saturday
/daily-standup --date -1

# Sunday
/daily-standup --date yesterday
```

If you worked on the weekend, you can still fetch that activity.

### Heavy Activity Day
```bash
/daily-standup --date 2026-02-08
```

**Output:**
```
DS: 47 commits
• Merge pull request #320 (ssn-admin)
• feat: add reporting dashboard (ssn-admin)
• fix: database connection (ssn-database)
• chore: sync agentic-layer ×18 (multiple repos)
• test: add unit tests (ssn-admin)
...
[Output may be truncated if very long]

5 PRs raised
• #320 feat: reporting dashboard (ssn-admin)
• #321 fix: API endpoints (ssn-web)
• #144 feat: database RPC (ssn-database)
• #99 docs: update docs (ssn-developer-onboarding)
• #67 chore: cleanup (ssn-etl)

8 PRs reviewed
...
```

## Integration Examples

### Combined with Other Skills

#### Weekly Report + Daily Standup
```bash
# Generate full weekly report
/ssn-report --week current --generate-dashboard

# Then get today's summary for standup
/daily-standup
```

#### Check Open PRs + Daily Activity
```bash
# See all open PRs
/open-prs

# Then check your activity today
/daily-standup
```

### Slack Integration Workflow

1. Run the command:
   ```bash
   /daily-standup --date yesterday
   ```

2. Copy the output (excluding the header):
   ```
   DS: 15 commits
   • feat: add enhanced reporting (ssn-admin)
   ...
   ```

3. Format for Slack with your additions:
   ```
   **Yesterday:**
   - 15 commits across ssn-admin, ssn-web, ssn-database
   - Opened PR #320: enhanced reporting dashboard
   - Reviewed 3 PRs

   **Today:**
   - Continue work on reporting dashboard
   - Review pending PRs
   - Team sync at 2pm

   **Blockers:**
   - None
   ```

## CLI Alternatives

All these work the same way:

```bash
# Via skill (recommended)
/daily-standup --date yesterday

# Via npm script
npm run daily-standup -- --date yesterday

# Via node CLI
node src/index.js --daily-standup --date yesterday

# Via skill runner
node .claude/skills/daily-standup/run.js yesterday
```

## Tips and Tricks

### Quick Copy to Slack
- Select the output text
- Right-click → Copy
- Paste in Slack (formatting preserved)

### Multiple Days at Once
```bash
# Create a quick script to review the week
for day in {1..5}; do
  echo "=== Day -$day ==="
  /daily-standup --date -$day
  echo ""
done
```

### Check if You Worked on a Specific Date
```bash
# Did I work on New Year's Day?
/daily-standup --date 2026-01-01

# Output will show 0 commits if no activity
```

### Find Your Most Productive Day
```bash
# Check each day of last week and compare commit counts
/daily-standup --date -7  # Compare outputs
/daily-standup --date -6
/daily-standup --date -5
/daily-standup --date -4
/daily-standup --date -3
```

## Error Scenarios

### Invalid Date Format
```bash
/daily-standup --date 02/11/2026
```
**Error:** Date format not recognized. Use YYYY-MM-DD or YYMMDD.

**Fix:**
```bash
/daily-standup --date 2026-02-11
```

### Missing Environment Variable
```bash
/daily-standup
```
**Error:** GITHUB_TOKEN not found in .env file

**Fix:** Add to `.env`:
```env
GITHUB_TOKEN=ghp_your_token_here
GITHUB_USERNAME=jonathanahlbom
```

### Future Date
```bash
/daily-standup --date 2027-01-01
```
**Output:** 0 commits (expected - future date has no activity)

## Advanced Usage

### Custom Date Range Analysis
While this tool shows single-day activity, you can use it with `/ssn-report` for ranges:

```bash
# Daily detail for specific day
/daily-standup --date 2026-02-11

# Weekly aggregate for that week
/ssn-report --week 2026-02-11 --generate-dashboard
```

### Automated Daily Export
Create a script to save daily standups:

```bash
#!/bin/bash
# save-standup.sh

DATE=$(date -d yesterday +%Y-%m-%d)
OUTPUT_FILE="standups/standup-$DATE.txt"

/daily-standup --date yesterday > "$OUTPUT_FILE"
echo "Standup saved to $OUTPUT_FILE"
```

### Team Comparison
Each team member can run their own standup:

```bash
# In your .env
GITHUB_USERNAME=jonathanahlbom

# Run standup
/daily-standup

# Compare with teammate (they run with their username)
```

## Troubleshooting Examples

### "No commits found but I know I committed"
**Possible causes:**
1. Wrong GitHub username in `.env`
2. Wrong date (check timezone - GitHub uses UTC)
3. Commits not yet pushed to GitHub

**Debug:**
```bash
# Check your username
echo $GITHUB_USERNAME

# Verify commits exist on GitHub
# Visit: https://github.com/sisp-sweden/ssn-admin/commits?author=jonathanahlbom
```

### "API rate limit exceeded"
The tool will automatically wait and retry. If you see this often:

1. Reduce frequency of calls
2. Check if other tools are using the same token
3. Wait for rate limit reset (shown in error message)

## Related Documentation

- [Main Skill Documentation](../SKILL.md)
- [Project CLAUDE.md](../../../CLAUDE.md)
- [GitHub API Documentation](https://docs.github.com/en/rest)
