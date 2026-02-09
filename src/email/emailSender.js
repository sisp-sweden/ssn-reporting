import { Resend } from 'resend';

/**
 * Send a weekly email report via Resend
 * @param {string} htmlContent - HTML email body
 * @param {string} textContent - Plain text fallback
 * @param {string} subject - Email subject line
 * @param {Object} emailConfig - { apiKey, from, to }
 * @returns {Promise<Object>} Resend API response
 */
export async function sendWeeklyEmail(htmlContent, textContent, subject, emailConfig) {
  const resend = new Resend(emailConfig.apiKey);

  const { data, error } = await resend.emails.send({
    from: emailConfig.from,
    to: emailConfig.to,
    subject,
    html: htmlContent,
    text: textContent
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
