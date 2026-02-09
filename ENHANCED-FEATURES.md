# Enhanced SSN Reporting System

## 🎯 New Features (v2.0)

### AI-Powered Analysis
- **Executive summaries** with team health insights
- **Per-contributor assessments** (balanced, professional tone)
- **Code quality analysis** from PR comments
- Powered by OpenAI GPT-4o

### Review Activity Tracking
- Code reviews given per contributor
- Review comments (line-specific feedback)
- Discussion comments (general PR discussions)
- Review states (approved, changes requested)

### Enhanced Data Storage
- New `/data` directory with enriched weekly JSON files
- Historical tracking of AI insights and review patterns
- Week-over-week trend analysis

### Better Email Reports
- AI-generated executive summary
- Per-person contribution profiles with context
- Review activity metrics (not just commits/PRs)
- Team metrics cards showing review counts
- Balanced, constructive feedback

## 📦 What Was Added

### New Dependencies
```json
{
  "openai": "^4.x.x"  // OpenAI SDK for GPT-4o
}
```

### New Modules

**AI Analysis (`src/ai/`):**
- `openaiClient.js` - OpenAI API wrapper
- `prAnalyzer.js` - Analyze PR comments for patterns
- `contributorAnalyzer.js` - Generate per-person summaries
- `executiveSummary.js` - Team-level insights
- `analysisWorkflow.js` - Orchestrate all AI analysis

**GitHub Integration:**
- `src/github/reviews.js` - Fetch reviews and comments

**Data Management:**
- `src/storage/enrichedDataManager.js` - Manage /data directory
- Updated `src/storage/dataAggregator.js` - Added review fields

**Email Templates:**
- `src/email/emailTemplatesEnhanced.js` - New templates with AI
- `src/email/emailOrchestratorEnhanced.js` - Enhanced workflow

### Updated Files
- `src/index.js` - Integrated review fetching and AI analysis
- `package.json` - Added openai dependency

## 🔧 Configuration

Add to `.env`:
```env
OPENAI_API_KEY=sk-your-real-key-here
OPENAI_MODEL=gpt-4o  # Optional, defaults to gpt-4o
```

## 🚀 Usage

### Collect Data (with AI Analysis)
```bash
# Current week with AI analysis
npm start

# Specific week with force refresh
node src/index.js --week 2026-06 --force

# The system automatically:
# 1. Fetches commits, PRs, reviews, comments
# 2. Aggregates metrics by person/day
# 3. Runs AI analysis (if OpenAI key present)
# 4. Saves to github-data/ and data/ directories
```

### Send Enhanced Email
```bash
# Send email for current week
npm run send-email

# Dry run (generate but don't send)
node src/index.js --send-email --week current --dry-run

# Send for specific week
node src/index.js --send-email --week 2026-06
```

### View Enriched Data
```bash
# View enriched data with AI insights
cat data/2026-06.json

# View basic metrics only
cat github-data/2026-06.json
```

## 📊 Data Structure

### Enriched Data (`data/YYYY-WW.json`)
```json
{
  "week": "2026-06",
  "weekStart": "2026-02-02",
  "weekEnd": "2026-02-08",

  "metrics": {
    "users": {
      "username": {
        "daily": {
          "2026-02-02": {
            "commits": 5,
            "prs": 2,
            "linesAdded": 120,
            "linesDeleted": 45,
            "reviewsGiven": 3,           // NEW
            "reviewCommentsGiven": 5,    // NEW
            "discussionCommentsGiven": 2 // NEW
          }
        },
        "weekly": { /* same fields, aggregated */ }
      }
    }
  },

  "reviewActivity": {
    "reviews": [
      {
        "id": 123,
        "reviewer": "username",
        "state": "APPROVED",
        "submittedAt": "2026-02-02T10:30:00Z",
        "repository": "sisp-sweden/ssn-admin",
        "prNumber": 42
      }
    ],
    "reviewComments": [ /* line-specific comments */ ],
    "discussionComments": [ /* general PR comments */ ],
    "stats": {
      "totalReviews": 53,
      "totalReviewComments": 38,
      "totalDiscussionComments": 186,
      "uniqueReviewers": 8
    }
  },

  "aiAnalysis": {
    "executiveSummary": {
      "headline": "Strong week with excellent review participation",
      "teamHealth": "The team maintained high velocity...",
      "trendAnalysis": "15% increase in code reviews...",
      "keyInsights": [
        "Review response time improved",
        "Strong collaboration patterns"
      ],
      "recommendations": [
        "Continue current review practices"
      ]
    },
    "prQualityAnalysis": {
      "overallQuality": "High quality discussions observed",
      "positivePatterns": [
        "Thorough code reviews with constructive feedback",
        "Quick response times on review requests"
      ],
      "areasForImprovement": [
        "Some PRs could benefit from earlier reviews"
      ]
    },
    "contributorAnalysis": {
      "username": {
        "summary": "Strong contributor with good review participation",
        "strengths": [
          "Consistent commit activity",
          "Active code reviewer"
        ],
        "growthAreas": []
      }
    },
    "generatedAt": "2026-02-07T10:32:49.475Z",
    "model": "gpt-4o"
  }
}
```

## 💰 Cost Estimate

**GPT-4o Pricing:**
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

**Estimated Weekly Report Cost:**
- Small team (5 people, 20 PRs): ~$0.02
- Medium team (10 people, 50 PRs): ~$0.05
- Large team (15+ people, 100 PRs): ~$0.10

The AI analysis runs automatically after data collection. If no OpenAI key is present, the system continues without AI insights.

## 🎨 Email Report Preview

### Executive Summary Section
```
┌─────────────────────────────────────┐
│ Strong week with excellent review   │
│ participation                        │
│                                      │
│ The team maintained high velocity    │
│ with 177 commits and 92 PRs...      │
│                                      │
│ Key Insights:                        │
│ • Review response time improved      │
│ • Strong collaboration patterns      │
└─────────────────────────────────────┘
```

### Team Metrics Section
```
┌──────────┬──────────┬──────────┐
│ Commits  │   PRs    │ Reviews  │
│   177    │    92    │    53    │
│  +15%    │   +8%    │  +23%    │
└──────────┴──────────┴──────────┘
```

### Individual Contributors Section
```
Jonathan
  Strong contributor with excellent review
  participation and consistent code quality.

  Commits: 25  PRs: 12  Reviews: 8
  Lines: +5,200  -1,100
```

## 🔍 Testing

All features tested and working:
- ✅ Review data collection
- ✅ AI analysis workflow
- ✅ Enriched data storage
- ✅ Enhanced email generation
- ✅ Backward compatibility (works without OpenAI key)

## 📝 Notes

- AI analysis runs automatically after data collection
- System gracefully handles missing OpenAI key
- All existing functionality preserved
- New `/data` directory created automatically
- Review metrics added to existing week data structure
- Email reports use enriched data when available
- Falls back to basic reports if enriched data missing

## 🐛 Troubleshooting

**AI analysis not running:**
- Check `.env` file has valid `OPENAI_API_KEY`
- Verify key starts with `sk-` and is not a placeholder
- Check console output for OpenAI API errors

**Review data not collected:**
- Ensure GitHub token has `repo` scope
- Check rate limit status (shown after collection)
- Verify repositories have open/recent PRs

**Email missing AI insights:**
- Run data collection first (generates enriched data)
- Check `data/YYYY-WW.json` exists
- Verify `aiAnalysis` section has content

## 🔄 Backward Compatibility

All existing features work unchanged:
- `npm start` - Still collects basic metrics
- `npm run dashboard` - Works with or without review data
- `npm run open-prs` - Unchanged
- `npm run kanban` - Unchanged

The system automatically uses enhanced features when available, falls back to basic features otherwise.
