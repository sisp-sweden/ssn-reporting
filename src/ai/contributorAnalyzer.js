import chalk from 'chalk';

/**
 * Build rich context for a contributor from review data
 * @param {string} username - GitHub username
 * @param {Object} weekData - Current week data with metrics
 * @param {Object} reviewData - { reviews, reviewComments, discussionComments }
 * @returns {Object} Rich context object with qualitative data
 */
export function buildContributorContext(username, weekData, reviewData) {
  const userData = weekData.users[username];
  const metrics = userData?.weekly || {};

  // PR titles authored by this person (from weekData if available, or infer from review data)
  const prsAuthored = [];
  const seenPRs = new Set();
  for (const review of reviewData.reviews) {
    if (review.prAuthor === username && !seenPRs.has(review.prNumber)) {
      seenPRs.add(review.prNumber);
      prsAuthored.push({
        number: review.prNumber,
        title: review.prTitle || `PR #${review.prNumber}`,
        repository: review.repository || ''
      });
    }
  }

  // Reviews they gave (state + which PRs)
  const reviewsGiven = reviewData.reviews
    .filter(r => r.reviewer === username)
    .map(r => ({
      prNumber: r.prNumber,
      prTitle: r.prTitle || `PR #${r.prNumber}`,
      prAuthor: r.prAuthor,
      state: r.state,
      repository: r.repository || ''
    }));

  // Discussion comments they wrote (body trimmed, max 5)
  const discussionCommentsWritten = reviewData.discussionComments
    .filter(c => c.author === username)
    .slice(0, 5)
    .map(c => ({
      prNumber: c.prNumber,
      prTitle: c.prTitle || `PR #${c.prNumber}`,
      body: (c.body || '').slice(0, 200),
      repository: c.repository || ''
    }));

  // Review comments they wrote (body trimmed, max 5)
  const reviewCommentsWritten = reviewData.reviewComments
    .filter(c => c.author === username)
    .slice(0, 5)
    .map(c => ({
      prNumber: c.prNumber,
      prTitle: c.prTitle || `PR #${c.prNumber}`,
      body: (c.body || '').slice(0, 200),
      repository: c.repository || ''
    }));

  // Comments others wrote on their PRs (body trimmed, max 5)
  const commentsOnTheirPRs = [
    ...reviewData.reviewComments.filter(c => c.prAuthor === username && c.author !== username),
    ...reviewData.discussionComments.filter(c => c.prAuthor === username && c.author !== username)
  ].slice(0, 5).map(c => ({
    author: c.author,
    prNumber: c.prNumber,
    prTitle: c.prTitle || `PR #${c.prNumber}`,
    body: (c.body || '').slice(0, 200)
  }));

  return {
    metrics: {
      commits: metrics.commits || 0,
      prs: metrics.prs || 0,
      linesAdded: metrics.linesAdded || 0,
      linesDeleted: metrics.linesDeleted || 0,
      reviewsGiven: metrics.reviewsGiven || reviewsGiven.length,
      reviewCommentsGiven: metrics.reviewCommentsGiven || reviewCommentsWritten.length,
      discussionCommentsGiven: metrics.discussionCommentsGiven || discussionCommentsWritten.length
    },
    prsAuthored,
    reviewsGiven,
    reviewCommentsWritten,
    discussionCommentsWritten,
    commentsOnTheirPRs
  };
}

/**
 * Generate per-person performance summaries with rich context
 * @param {OpenAIClient} aiClient - OpenAI client
 * @param {Object} weekData - Current week data with metrics
 * @param {Object} reviewData - Review activity data
 * @param {Object} modelOptions - { extractionModel, analysisModel }
 * @returns {Promise<Object>} Per-contributor summaries
 */
export async function analyzeContributors(aiClient, weekData, reviewData, modelOptions = {}) {
  const extractionModel = modelOptions.extractionModel;
  const analysisModel = modelOptions.analysisModel;

  console.log(chalk.cyan('Analyzing individual contributors...'));
  if (extractionModel && analysisModel) {
    console.log(chalk.dim(`  Stage 1 (extraction): ${extractionModel}`));
    console.log(chalk.dim(`  Stage 2 (analysis): ${analysisModel}`));
  }

  // Build rich context for each contributor
  const contributorContexts = {};

  for (const [username] of Object.entries(weekData.users)) {
    if (username.endsWith('[bot]')) continue;

    const context = buildContributorContext(username, weekData, reviewData);

    // Skip fully inactive contributors
    const m = context.metrics;
    if (m.commits === 0 && m.prs === 0 && m.reviewsGiven === 0 && m.reviewCommentsGiven === 0) {
      continue;
    }

    contributorContexts[username] = context;
  }

  if (Object.keys(contributorContexts).length === 0) {
    console.log(chalk.yellow('No active contributors this week'));
    return {};
  }

  // Stage 1: Extract and condense events per person (cheap model)
  let condensedEvents = {};
  try {
    const extractionPrompt = `You are a data extraction assistant. For each contributor below, extract a concise list of their key activities this week.

For each person, list:
- PRs they authored (with titles)
- Reviews they gave and to whom
- Notable comments they made (paraphrase briefly)
- Notable feedback they received

Return JSON:
{
  "username": {
    "keyEvents": ["event 1", "event 2", ...]
  }
}

Keep each event to one short sentence. Max 5 events per person.`;

    const extractionData = {};
    for (const [username, ctx] of Object.entries(contributorContexts)) {
      extractionData[username] = {
        metrics: ctx.metrics,
        prsAuthored: ctx.prsAuthored.map(p => p.title),
        reviewsGiven: ctx.reviewsGiven.map(r => `${r.state} on ${r.prAuthor}'s "${r.prTitle}"`),
        commentsWritten: [
          ...ctx.reviewCommentsWritten.map(c => c.body),
          ...ctx.discussionCommentsWritten.map(c => c.body)
        ].slice(0, 3),
        feedbackReceived: ctx.commentsOnTheirPRs.map(c => `${c.author}: ${c.body}`).slice(0, 3)
      };
    }

    condensedEvents = await aiClient.generateJSONCompletion(
      extractionPrompt,
      `Extract key events for these contributors:\n\n${JSON.stringify(extractionData, null, 2)}`,
      { temperature: 0.3, max_tokens: 2000, model: extractionModel }
    );

    console.log(chalk.green('  ✓ Stage 1: Events extracted'));
  } catch (error) {
    console.error(chalk.yellow('  ⚠ Stage 1 failed, continuing with metrics only:'), error.message);
  }

  // Stage 2: Generate assessments using analysis model
  const systemPrompt = `You are a senior engineering manager providing BALANCED, PROFESSIONAL feedback on team member contributions.

For each contributor, write a 2-3 sentence assessment that:
- References SPECIFIC events from their week (PR titles, review feedback, comments)
- Highlights their concrete contributions and impact
- Notes constructive growth areas only if clearly warranted
- Avoids generic praise - be specific about what they actually did

Return JSON:
{
  "username": {
    "summary": "2-3 sentence assessment referencing specific events",
    "strengths": ["specific strengths"],
    "growthAreas": ["constructive suggestions, if any"]
  }
}`;

  // Build the analysis prompt with condensed events + metrics
  const analysisData = {};
  for (const [username, ctx] of Object.entries(contributorContexts)) {
    analysisData[username] = {
      metrics: ctx.metrics,
      keyEvents: condensedEvents[username]?.keyEvents || [],
      prsAuthored: ctx.prsAuthored.map(p => p.title)
    };
  }

  try {
    const analysis = await aiClient.generateJSONCompletion(systemPrompt,
      `Analyze these contributors from the past week. Reference their specific events in your summaries:\n\n${JSON.stringify(analysisData, null, 2)}`,
      { temperature: 0.7, max_tokens: 2000, model: analysisModel }
    );

    console.log(chalk.green(`  ✓ Stage 2: Analyzed ${Object.keys(analysis).length} contributors`));

    return analysis;
  } catch (error) {
    console.error(chalk.red('Error analyzing contributors:'), error.message);
    return {};
  }
}

/**
 * Calculate a contribution score for ranking (internal use, not shown to users)
 * @param {Object} contributorData - Metrics for a contributor
 * @returns {number} Weighted score
 */
// Max points from lines changed (prevents outlier weeks from dominating)
const CODE_SCORE_CAP = 300;

export function calculateContributionScore(contributorData) {
  const {
    commits = 0,
    prs = 0,
    linesAdded = 0,
    linesDeleted = 0,
    reviewsGiven = 0,
    reviewCommentsGiven = 0,
    uniquePRsReviewed = 0
  } = contributorData;

  const codeRaw = (linesAdded + linesDeleted) * 0.01;

  // Weighted scoring
  return (
    commits * 2 +
    prs * 5 +
    Math.min(codeRaw, CODE_SCORE_CAP) +
    reviewsGiven * 5 +
    uniquePRsReviewed * 4 +
    reviewCommentsGiven * 1
  );
}

/**
 * Calculate contribution score broken down by category for stacked bar charts
 * @param {Object} data - Metrics for a contributor
 * @returns {Object} Score breakdown { commits, prs, reviews, code, total }
 */
export function calculateContributionScoreBreakdown(data) {
  const commits = (data.commits || 0) * 2;
  const prs = (data.prs || 0) * 5;
  const reviews = (data.reviewsGiven || 0) * 5 +
    (data.uniquePRsReviewed || 0) * 4 +
    (data.reviewCommentsGiven || 0) * 1;
  const codeRaw = ((data.linesAdded || 0) + (data.linesDeleted || 0)) * 0.01;
  const code = Math.min(codeRaw, CODE_SCORE_CAP);

  return {
    commits: Math.round(commits * 100) / 100,
    prs: Math.round(prs * 100) / 100,
    reviews: Math.round(reviews * 100) / 100,
    code: Math.round(code * 100) / 100,
    total: Math.round((commits + prs + reviews + code) * 100) / 100
  };
}
