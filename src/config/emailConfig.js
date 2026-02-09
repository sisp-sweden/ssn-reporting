/**
 * Email configuration for weekly reports
 * Reads from environment variables with sensible defaults
 */

/**
 * Get email configuration from environment variables
 * @returns {Object} { apiKey, from, to }
 * @throws {Error} If RESEND_API_KEY is not set
 */
export function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY environment variable is required.\n' +
      'Set it in your .env file or as an environment variable.'
    );
  }

  return {
    apiKey,
    from: process.env.EMAIL_FROM || 'SSN Reports <reports@swedenstartupnext.se>',
    to: process.env.EMAIL_TO || 'jonathan.ahlbom@sisp.se'
  };
}
