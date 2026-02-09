import chalk from 'chalk';

/**
 * Generate executive-level team insights
 * @param {OpenAIClient} aiClient - OpenAI client
 * @param {Object} weekData - Current week data
 * @param {Object} previousWeekData - Previous week data (may be null)
 * @param {Object} reviewData - Review activity data
 * @param {Object} prAnalysis - PR quality analysis
 * @returns {Promise<Object>} Executive summary
 */
export async function generateExecutiveSummary(aiClient, weekData, previousWeekData, reviewData, prAnalysis) {
  console.log(chalk.cyan('Generating executive summary with GPT-4o...'));

  // Calculate team totals
  const currentTotals = calculateTeamTotals(weekData);
  const previousTotals = previousWeekData ? calculateTeamTotals(previousWeekData) : null;

  // Calculate review metrics
  const reviewMetrics = {
    totalReviews: reviewData.reviews.length,
    totalReviewComments: reviewData.reviewComments.length,
    totalDiscussionComments: reviewData.discussionComments.length,
    uniqueReviewers: new Set(reviewData.reviews.map(r => r.reviewer)).size,
    approvals: reviewData.reviews.filter(r => r.state === 'APPROVED').length,
    changesRequested: reviewData.reviews.filter(r => r.state === 'CHANGES_REQUESTED').length
  };

  // Active contributor count
  const activeContributors = Object.values(weekData.users).filter(u =>
    (u.weekly?.commits || 0) > 0 || (u.weekly?.prs || 0) > 0
  ).length;

  const systemPrompt = `You are a CTO providing an executive summary for leadership.

Focus on:
1. High-level team health and velocity
2. Trends (if previous week data available)
3. Code review culture and quality
4. Notable achievements or concerns
5. Forward-looking recommendations

Be CONCISE (3-4 paragraphs), PROFESSIONAL, and BALANCED.
Highlight both strengths and areas for improvement.

Return JSON:
{
  "headline": "one-sentence key takeaway",
  "teamHealth": "assessment of overall team health and velocity",
  "trendAnalysis": "week-over-week trends (if available)",
  "codeReviewQuality": "assessment of review practices",
  "keyInsights": ["2-3 notable observations"],
  "recommendations": ["1-2 actionable recommendations"]
}`;

  const userPrompt = `Generate an executive summary for this week:

CURRENT WEEK METRICS:
- Commits: ${currentTotals.commits}
- Pull Requests: ${currentTotals.prs}
- Lines Added: ${currentTotals.linesAdded}
- Lines Deleted: ${currentTotals.linesDeleted}
- Active Contributors: ${activeContributors}

REVIEW ACTIVITY:
- Total Reviews: ${reviewMetrics.totalReviews}
- Unique Reviewers: ${reviewMetrics.uniqueReviewers}
- Approvals: ${reviewMetrics.approvals}
- Changes Requested: ${reviewMetrics.changesRequested}
- Review Comments: ${reviewMetrics.totalReviewComments}

${previousTotals ? `PREVIOUS WEEK FOR COMPARISON:
- Commits: ${previousTotals.commits}
- Pull Requests: ${previousTotals.prs}
- Lines Added: ${previousTotals.linesAdded}
- Lines Deleted: ${previousTotals.linesDeleted}
` : 'No previous week data for comparison.'}

PR QUALITY ANALYSIS:
${JSON.stringify(prAnalysis, null, 2)}

Provide a concise, balanced executive summary.`;

  try {
    const summary = await aiClient.generateJSONCompletion(systemPrompt, userPrompt, {
      temperature: 0.7,
      max_tokens: 1500
    });

    console.log(chalk.green('✓ Executive summary generated'));

    return summary;
  } catch (error) {
    console.error(chalk.red('Error generating executive summary:'), error.message);
    return {
      headline: 'Weekly development activity summary',
      teamHealth: 'Analysis unavailable',
      trendAnalysis: 'Unable to assess trends',
      codeReviewQuality: 'Review data collected',
      keyInsights: [],
      recommendations: []
    };
  }
}

/**
 * Calculate team totals from week data
 * @param {Object} weekData - Week data object
 * @returns {Object} Team totals
 */
function calculateTeamTotals(weekData) {
  let commits = 0;
  let prs = 0;
  let linesAdded = 0;
  let linesDeleted = 0;

  for (const userData of Object.values(weekData.users)) {
    if (userData.weekly) {
      commits += userData.weekly.commits || 0;
      prs += userData.weekly.prs || 0;
      linesAdded += userData.weekly.linesAdded || 0;
      linesDeleted += userData.weekly.linesDeleted || 0;
    }
  }

  return { commits, prs, linesAdded, linesDeleted };
}
