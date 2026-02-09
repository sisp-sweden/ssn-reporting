import chalk from 'chalk';

/**
 * Analyze PR comments for quality patterns and potential issues
 * @param {OpenAIClient} aiClient - OpenAI client
 * @param {Object} reviewData - { reviews, reviewComments, discussionComments }
 * @param {Array} prs - Array of PR objects
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzePRComments(aiClient, reviewData, prs, modelOptions = {}) {
  const modelLabel = modelOptions.model || aiClient.getModel();
  console.log(chalk.cyan(`Analyzing PR comments with ${modelLabel}...`));

  // Prepare data for analysis
  const prSummaries = prs.map(pr => {
    const prReviews = reviewData.reviews.filter(r => r.prNumber === pr.number);
    const prReviewComments = reviewData.reviewComments.filter(c => c.prNumber === pr.number);
    const prDiscussionComments = reviewData.discussionComments.filter(c => c.prNumber === pr.number);

    return {
      number: pr.number,
      title: pr.title,
      author: pr.author,
      repository: pr.repository,
      reviewCount: prReviews.length,
      reviewStates: prReviews.map(r => r.state),
      reviewCommentCount: prReviewComments.length,
      discussionCommentCount: prDiscussionComments.length,
      sampleComments: [
        ...prReviewComments.slice(0, 3).map(c => c.body),
        ...prDiscussionComments.slice(0, 2).map(c => c.body)
      ].filter(Boolean)
    };
  });

  const systemPrompt = `You are a senior engineering manager analyzing GitHub pull request activity.
Your goal is to identify patterns in code review quality, collaboration, and potential issues.

Provide insights in a BALANCED and PROFESSIONAL tone:
- Highlight strengths and areas for improvement
- Frame constructively, not critically
- Focus on patterns, not personal criticism
- Suggest actionable improvements

Return your analysis as JSON with this structure:
{
  "overallQuality": "brief assessment of review quality",
  "positivePatterns": ["list of good practices observed"],
  "areasForImprovement": ["constructive suggestions"],
  "notableObservations": ["interesting patterns or outliers"],
  "collaborationHealth": "assessment of team collaboration"
}`;

  const userPrompt = `Analyze these pull requests from the past week:

${JSON.stringify(prSummaries, null, 2)}

Total statistics:
- ${prs.length} pull requests
- ${reviewData.reviews.length} reviews
- ${reviewData.reviewComments.length} review comments
- ${reviewData.discussionComments.length} discussion comments

Provide a balanced, professional analysis of patterns and quality.`;

  try {
    const analysis = await aiClient.generateJSONCompletion(systemPrompt, userPrompt, {
      temperature: 0.7,
      max_tokens: 1500,
      model: modelOptions.model
    });

    console.log(chalk.green('✓ PR comment analysis complete'));

    return analysis;
  } catch (error) {
    console.error(chalk.red('Error analyzing PR comments:'), error.message);
    return {
      overallQuality: 'Analysis unavailable',
      positivePatterns: [],
      areasForImprovement: [],
      notableObservations: [],
      collaborationHealth: 'Unable to assess'
    };
  }
}

/**
 * Analyze specific PR for potential problems
 * @param {OpenAIClient} aiClient - OpenAI client
 * @param {Object} pr - PR object
 * @param {Object} prReviewData - Reviews and comments for this PR
 * @returns {Promise<Object>} Problem assessment
 */
export async function analyzePRForProblems(aiClient, pr, prReviewData) {
  const { reviews, reviewComments, discussionComments } = prReviewData;

  // Check for red flags
  const hasChangesRequested = reviews.some(r => r.state === 'CHANGES_REQUESTED');
  const hasHighCommentCount = reviewComments.length > 10;
  const hasLongDiscussion = discussionComments.length > 5;

  if (!hasChangesRequested && !hasHighCommentCount && !hasLongDiscussion) {
    return {
      hasProblems: false,
      severity: 'none',
      issues: []
    };
  }

  const systemPrompt = `You are analyzing a pull request for potential problems or blockers.
Identify concrete issues that may need attention, but frame them constructively.

Return JSON:
{
  "hasProblems": boolean,
  "severity": "low" | "medium" | "high",
  "issues": ["list of specific concerns"],
  "recommendation": "brief actionable recommendation"
}`;

  const userPrompt = `Analyze this PR:
Title: ${pr.title}
Author: ${pr.author}
Reviews: ${reviews.length} (${reviews.filter(r => r.state === 'CHANGES_REQUESTED').length} requesting changes)
Review comments: ${reviewComments.length}
Discussion comments: ${discussionComments.length}

Sample comments:
${[...reviewComments, ...discussionComments].slice(0, 5).map(c => c.body).join('\n---\n')}

Are there problems or blockers that need attention?`;

  try {
    const analysis = await aiClient.generateJSONCompletion(systemPrompt, userPrompt, {
      temperature: 0.5,
      max_tokens: 500
    });

    return analysis;
  } catch (error) {
    console.error(chalk.red(`Error analyzing PR #${pr.number}:`), error.message);
    return {
      hasProblems: false,
      severity: 'unknown',
      issues: [],
      recommendation: 'Manual review recommended'
    };
  }
}
