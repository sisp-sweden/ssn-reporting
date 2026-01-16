# GitHub Actions Setup Guide

This guide explains how to set up automated reporting using GitHub Actions with Claude Cloud.

## Setup GitHub Secret

1. **Create a GitHub Personal Access Token**:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Give it a name: `SSN Reporting Token`
   - Select scopes: `repo` (full repository access)
   - Click "Generate token"
   - **Copy the token** (you won't see it again!)

2. **Add the token to GitHub Secrets**:
   - Go to https://github.com/sisp-sweden/ssn-reporting/settings/secrets/actions
   - Click "New repository secret"
   - Name: `REPORTING_GITHUB_TOKEN`
   - Value: Paste your token
   - Click "Add secret"

## Available Workflows

### 1. Weekly GitHub Report (`weekly-report.yml`)
Collects commit, PR, and line change data from tracked repositories.

**Schedule**: Every Monday at 9 AM UTC (automatic)

**Manual trigger via Claude Cloud**:
```bash
gh workflow run weekly-report.yml
gh workflow run weekly-report.yml -f week=current -f force=true -f generate_dashboard=true
gh workflow run weekly-report.yml -f week=2025-02 -f force=true
```

### 2. Update All Dashboards (`update-dashboards.yml`)
Updates all three dashboards: activity, open PRs, and kanban.

**Schedule**: Every Monday at 8 AM UTC (automatic)

**Manual trigger via Claude Cloud**:
```bash
gh workflow run update-dashboards.yml
```

## Triggering Workflows from Claude Cloud

When using Claude at claude.ai/code, you can trigger workflows without exposing your token:

```bash
# Authenticate GitHub CLI (one-time setup)
gh auth login

# Trigger weekly report
gh workflow run weekly-report.yml

# Trigger with specific week
gh workflow run weekly-report.yml -f week=last -f force=true

# Trigger daily dashboard update
gh workflow run update-dashboards.yml

# Check workflow status
gh run list --workflow=weekly-report.yml

# View workflow logs
gh run view --log
```

## Viewing Results

After workflows complete:

1. **View workflow runs**: https://github.com/sisp-sweden/ssn-reporting/actions
2. **Download artifacts**: Click on a workflow run → "Artifacts" section
3. **Files included**: `dashboard.html`, `open-prs.html`, `kanban-dashboard.html`, and JSON data

## Optional: Auto-commit Data

If you want the workflow to commit generated data back to the repository:

1. Edit `.github/workflows/weekly-report.yml`
2. Change `if: false` to `if: true` in the "Commit and push data" step
3. Data will be automatically committed to the `github-data/` directory

## Local Development vs Cloud

| Environment | Token Storage | How to Use |
|-------------|---------------|------------|
| **Local CLI** | `.env` file | `npm start`, `npm run dashboard` |
| **Claude Cloud** | GitHub Secret | `gh workflow run ...` |
| **GitHub Actions** | Repository Secret | Automatic on schedule |

## Security Notes

- ✅ GitHub Secrets are encrypted and not exposed in logs
- ✅ Workflow logs redact secret values automatically
- ✅ Only repository collaborators can trigger workflows
- ✅ The `.env` file is gitignored and never committed
- ⚠️ Never paste your token directly into Claude Cloud
