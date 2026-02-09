import OpenAI from 'openai';
import chalk from 'chalk';

/**
 * Default model configuration for multi-model routing
 * - extraction: cheap model for data extraction/condensing
 * - analysis: reasoning model for insights and summaries
 */
export const DEFAULT_MODEL_CONFIG = {
  extraction: 'gpt-4o-mini',
  analysis: 'gpt-4o'
};

/**
 * OpenAI API client wrapper with multi-model support
 */
export class OpenAIClient {
  constructor(apiKey, model = 'gpt-4o') {
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Please set OPENAI_API_KEY in .env');
    }

    this.client = new OpenAI({
      apiKey
    });

    this.model = model;
    this.requestCount = 0;
  }

  /**
   * Generate a completion
   * @param {string} systemPrompt - System instructions
   * @param {string} userPrompt - User message
   * @param {Object} options - Additional options (temperature, max_tokens, model)
   * @returns {Promise<string>} AI response
   */
  async generateCompletion(systemPrompt, userPrompt, options = {}) {
    const { model: overrideModel, ...restOptions } = options;
    const useModel = overrideModel || this.model;

    try {
      const response = await this.client.chat.completions.create({
        model: useModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: restOptions.temperature || 0.7,
        max_tokens: restOptions.max_tokens || 2000,
        ...restOptions
      });

      this.requestCount++;

      return response.choices[0].message.content;
    } catch (error) {
      console.error(chalk.red(`OpenAI API error (${useModel}):`), error.message);
      throw error;
    }
  }

  /**
   * Generate a structured JSON completion
   * @param {string} systemPrompt - System instructions
   * @param {string} userPrompt - User message
   * @param {Object} options - Additional options (model override supported)
   * @returns {Promise<Object>} Parsed JSON response
   */
  async generateJSONCompletion(systemPrompt, userPrompt, options = {}) {
    const { model: overrideModel, ...restOptions } = options;
    const useModel = overrideModel || this.model;

    try {
      const response = await this.client.chat.completions.create({
        model: useModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: restOptions.temperature || 0.7,
        max_tokens: restOptions.max_tokens || 2000,
        response_format: { type: 'json_object' },
        ...restOptions
      });

      this.requestCount++;

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error(chalk.red(`OpenAI API error (${useModel}):`), error.message);
      throw error;
    }
  }

  /**
   * Get the number of API requests made
   * @returns {number}
   */
  getRequestCount() {
    return this.requestCount;
  }

  /**
   * Get the current model name
   * @returns {string}
   */
  getModel() {
    return this.model;
  }
}
