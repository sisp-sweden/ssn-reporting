import chalk from 'chalk';
import { OpenAIClient, DEFAULT_MODEL_CONFIG } from './openaiClient.js';
import { analyzePRComments } from './prAnalyzer.js';
import { analyzeContributors } from './contributorAnalyzer.js';
import { generateExecutiveSummary } from './executiveSummary.js';

/**
 * Run complete AI analysis workflow on week data
 * @param {Object} weekData - Current week data
 * @param {Object} previousWeekData - Previous week data (may be null)
 * @param {Object} reviewData - { reviews, reviewComments, discussionComments }
 * @param {Array} prs - Array of PR objects
 * @param {string} apiKey - OpenAI API key
 * @param {Object|string} modelConfig - Model config { extraction, analysis } or single model string
 * @returns {Promise<Object>} Complete AI analysis
 */
export async function runAIAnalysis(weekData, previousWeekData, reviewData, prs, apiKey, modelConfig = DEFAULT_MODEL_CONFIG) {
  console.log(chalk.bold.cyan('\n🤖 Running AI Analysis\n'));

  if (!apiKey) {
    console.log(chalk.yellow('⚠️  No OpenAI API key found - skipping AI analysis'));
    return {
      executiveSummary: {},
      prQualityAnalysis: {},
      contributorAnalysis: {},
      model: null,
      skipped: true
    };
  }

  // Normalize modelConfig: support legacy single string
  const models = typeof modelConfig === 'string'
    ? { extraction: modelConfig, analysis: modelConfig }
    : { ...DEFAULT_MODEL_CONFIG, ...modelConfig };

  try {
    // Initialize OpenAI client with the analysis model as default
    const aiClient = new OpenAIClient(apiKey, models.analysis);
    console.log(chalk.dim(`Models: extraction=${models.extraction}, analysis=${models.analysis}\n`));

    // 1. Analyze PR comments (extraction model - cheaper)
    const prQualityAnalysis = await analyzePRComments(aiClient, reviewData, prs, {
      model: models.extraction
    });

    // 2. Analyze individual contributors (two-stage: extraction then analysis)
    const contributorAnalysis = await analyzeContributors(aiClient, weekData, reviewData, {
      extractionModel: models.extraction,
      analysisModel: models.analysis
    });

    // 3. Generate executive summary (analysis model)
    const executiveSummary = await generateExecutiveSummary(
      aiClient,
      weekData,
      previousWeekData,
      reviewData,
      prQualityAnalysis
    );

    console.log(chalk.green(`\n✓ AI analysis complete (${aiClient.getRequestCount()} API calls)\n`));

    return {
      executiveSummary,
      prQualityAnalysis,
      contributorAnalysis,
      models,
      model: models.analysis, // backward compat
      requestCount: aiClient.getRequestCount()
    };
  } catch (error) {
    console.error(chalk.red('Error during AI analysis:'), error.message);
    console.log(chalk.yellow('Continuing without AI insights...'));

    return {
      executiveSummary: {},
      prQualityAnalysis: {},
      contributorAnalysis: {},
      models,
      model: models.analysis,
      error: error.message
    };
  }
}
