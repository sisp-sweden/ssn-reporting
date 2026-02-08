/**
 * Enhanced email template generation with AI insights
 * Produces table-based HTML email (inline CSS, no JS, 600px max-width)
 * and plain text fallback
 */

/**
 * Format a number with locale separators
 */
function fmt(num) {
  return (num || 0).toLocaleString('en-US');
}

/**
 * Get trend arrow and color for a metric comparison
 */
function getTrend(metric) {
  if (!metric || metric.isNoData) {
    return { arrow: '', color: '#6b7280', label: '' };
  }
  if (metric.isNew) {
    return { arrow: '★', color: '#0d9488', label: 'NEW' };
  }
  if (metric.isInactive) {
    return { arrow: '↓', color: '#dc2626', label: '-100%' };
  }
  if (metric.change > 0) {
    return { arrow: '↑', color: '#0d9488', label: `+${metric.change}%` };
  }
  if (metric.change < 0) {
    return { arrow: '↓', color: '#dc2626', label: `${metric.change}%` };
  }
  return { arrow: '→', color: '#6b7280', label: '0%' };
}

/**
 * Generate trend HTML snippet
 */
function trendHtml(metric) {
  const t = getTrend(metric);
  if (!t.label) return '';
  return ` <span style="color:${t.color};font-size:12px;">${t.arrow} ${t.label}</span>`;
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate enhanced HTML email with AI insights
 * @param {Object} emailData - { weekStr, dateRange, comparison, enrichedData }
 * @returns {string} Complete HTML email
 */
export function generateEnhancedEmailHTML(emailData) {
  const { weekStr, dateRange, comparison, enrichedData } = emailData;
  const aiAnalysis = enrichedData?.aiAnalysis || {};
  const team = comparison.comparisons.team;
  const users = comparison.comparisons.users;

  // Separate bots from regular users
  const allUsers = Object.entries(users);
  const botNames = ['claude', 'Copilot'];
  const regularUsers = allUsers.filter(([username]) => !botNames.includes(username));
  const botUsers = allUsers.filter(([username]) => botNames.includes(username));

  // Sort regular users alphabetically (case-insensitive)
  const sortedRegularUsers = regularUsers.sort((a, b) =>
    a[0].toLowerCase().localeCompare(b[0].toLowerCase())
  );

  // Sort bots alphabetically
  const sortedBotUsers = botUsers.sort((a, b) =>
    a[0].toLowerCase().localeCompare(b[0].toLowerCase())
  );

  // Combine: regular users first, then bots
  const sortedUsers = [...sortedRegularUsers, ...sortedBotUsers];

  const activeCount = sortedUsers.filter(([, u]) =>
    (u.commits?.current || 0) + (u.prs?.current || 0) > 0
  ).length;

  // Executive Summary section
  const execSummary = aiAnalysis.executiveSummary || {};
  const execSummaryHtml = execSummary.headline ? `
    <tr>
      <td style="padding:24px 24px 0;">
        <h2 style="margin:0 0 16px;font-size:16px;color:#111827;border-bottom:2px solid #0d9488;padding-bottom:8px;">Executive Summary</h2>
        <div style="background-color:#f0fdfa;border-left:4px solid #0d9488;padding:16px;border-radius:4px;margin-bottom:16px;">
          <p style="margin:0 0 12px;font-weight:600;color:#0f766e;font-size:15px;">${escapeHtml(execSummary.headline)}</p>
          <p style="margin:0 0 8px;color:#374151;line-height:1.6;">${escapeHtml(execSummary.teamHealth || '')}</p>
          ${execSummary.trendAnalysis ? `<p style="margin:0;color:#374151;line-height:1.6;">${escapeHtml(execSummary.trendAnalysis)}</p>` : ''}
        </div>
        ${execSummary.keyInsights && execSummary.keyInsights.length > 0 ? `
        <div style="margin:16px 0;">
          <p style="margin:0 0 8px;font-weight:600;color:#111827;font-size:14px;">Key Insights:</p>
          <ul style="margin:0;padding-left:20px;color:#374151;line-height:1.8;">
            ${execSummary.keyInsights.map(insight => `<li>${escapeHtml(insight)}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </td>
    </tr>
  ` : '';

  // Team Metrics section
  const reviewStats = enrichedData?.reviewActivity?.stats || {};
  const teamMetricsHtml = `
    <tr>
      <td style="padding:24px;">
        <h2 style="margin:0 0 16px;font-size:16px;color:#111827;border-bottom:2px solid #0d9488;padding-bottom:8px;">Team Metrics</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="33.33%" style="padding:8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdfa;border-radius:6px;padding:12px;">
                <tr><td style="text-align:center;">
                  <div style="font-size:24px;font-weight:700;color:#0f766e;">${fmt(team.commits?.current)}</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:4px;">Commits${trendHtml(team.commits)}</div>
                </td></tr>
              </table>
            </td>
            <td width="33.33%" style="padding:8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdfa;border-radius:6px;padding:12px;">
                <tr><td style="text-align:center;">
                  <div style="font-size:24px;font-weight:700;color:#0f766e;">${fmt(team.prs?.current)}</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:4px;">Pull Requests${trendHtml(team.prs)}</div>
                </td></tr>
              </table>
            </td>
            <td width="33.33%" style="padding:8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef3c7;border-radius:6px;padding:12px;">
                <tr><td style="text-align:center;">
                  <div style="font-size:24px;font-weight:700;color:#92400e;">${fmt(reviewStats.totalReviews || 0)}</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:4px;">Code Reviews</div>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td width="33.33%" style="padding:8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdfa;border-radius:6px;padding:12px;">
                <tr><td style="text-align:center;">
                  <div style="font-size:24px;font-weight:700;color:#0d9488;">${fmt(team.linesAdded?.current)}</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:4px;">Lines Added${trendHtml(team.linesAdded)}</div>
                </td></tr>
              </table>
            </td>
            <td width="33.33%" style="padding:8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:6px;padding:12px;">
                <tr><td style="text-align:center;">
                  <div style="font-size:24px;font-weight:700;color:#dc2626;">${fmt(team.linesDeleted?.current)}</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:4px;">Lines Deleted${trendHtml(team.linesDeleted)}</div>
                </td></tr>
              </table>
            </td>
            <td width="33.33%" style="padding:8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef3c7;border-radius:6px;padding:12px;">
                <tr><td style="text-align:center;">
                  <div style="font-size:24px;font-weight:700;color:#92400e;">${fmt(reviewStats.uniqueReviewers || 0)}</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:4px;">Active Reviewers</div>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:12px 0 0;font-size:13px;color:#6b7280;text-align:center;">${activeCount} active contributor${activeCount !== 1 ? 's' : ''} this week</p>
      </td>
    </tr>
  `;

  // Individual Contributors section with AI summaries
  const contributorAnalysis = aiAnalysis.contributorAnalysis || {};
  const botNames = ['claude', 'Copilot'];
  const userRows = sortedUsers.map(([username, metrics], i) => {
    const isBot = botNames.includes(username);
    const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    const borderTop = isBot && i === sortedRegularUsers.length ? 'border-top:2px solid #64748b;' : '';
    const nameColor = isBot ? '#64748b' : '#111827';
    const botBadge = isBot ? ' <span style="font-size:11px;background-color:#e2e8f0;padding:2px 6px;border-radius:3px;margin-left:6px;">🤖 Bot</span>' : '';
    const analysis = contributorAnalysis[username];

    return `
      <tr style="background-color:${bgColor};${borderTop}">
        <td colspan="7" style="padding:12px;">
          <div style="font-weight:600;color:${nameColor};margin-bottom:4px;">${username}${botBadge}</div>
          ${analysis?.summary ? `<div style="font-size:13px;color:#6b7280;margin-bottom:8px;line-height:1.5;">${escapeHtml(analysis.summary)}</div>` : ''}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 8px;text-align:center;font-size:13px;">
                <div style="font-weight:600;color:#0f766e;">${fmt(metrics.commits?.current)}</div>
                <div style="font-size:11px;color:#9ca3af;">Commits${trendHtml(metrics.commits)}</div>
              </td>
              <td style="padding:4px 8px;text-align:center;font-size:13px;">
                <div style="font-weight:600;color:#0f766e;">${fmt(metrics.prs?.current)}</div>
                <div style="font-size:11px;color:#9ca3af;">PRs${trendHtml(metrics.prs)}</div>
              </td>
              <td style="padding:4px 8px;text-align:center;font-size:13px;">
                <div style="font-weight:600;color:#92400e;">${fmt(metrics.reviewsGiven?.current || 0)}</div>
                <div style="font-size:11px;color:#9ca3af;">Reviews</div>
              </td>
              <td style="padding:4px 8px;text-align:center;font-size:13px;">
                <div style="font-weight:600;color:#0d9488;">${fmt(metrics.linesAdded?.current)}</div>
                <div style="font-size:11px;color:#9ca3af;">Lines+${trendHtml(metrics.linesAdded)}</div>
              </td>
              <td style="padding:4px 8px;text-align:center;font-size:13px;">
                <div style="font-weight:600;color:#dc2626;">${fmt(metrics.linesDeleted?.current)}</div>
                <div style="font-size:11px;color:#9ca3af;">Lines-${trendHtml(metrics.linesDeleted)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join('');

  // Code Quality Insights
  const prQuality = aiAnalysis.prQualityAnalysis || {};
  const codeQualityHtml = prQuality.overallQuality ? `
    <tr>
      <td style="padding:0 24px 24px;">
        <h2 style="margin:0 0 16px;font-size:16px;color:#111827;border-bottom:2px solid #0d9488;padding-bottom:8px;">Code Quality & Collaboration</h2>
        <p style="margin:0 0 12px;color:#374151;line-height:1.6;"><strong>Overall:</strong> ${escapeHtml(prQuality.overallQuality)}</p>
        ${prQuality.positivePatterns && prQuality.positivePatterns.length > 0 ? `
        <div style="margin-bottom:12px;">
          <p style="margin:0 0 6px;font-weight:600;color:#059669;font-size:14px;">✓ Strengths:</p>
          <ul style="margin:0;padding-left:20px;color:#374151;line-height:1.7;">
            ${prQuality.positivePatterns.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
        ${prQuality.areasForImprovement && prQuality.areasForImprovement.length > 0 ? `
        <div>
          <p style="margin:0 0 6px;font-weight:600;color:#d97706;font-size:14px;">→ Growth Opportunities:</p>
          <ul style="margin:0;padding-left:20px;color:#374151;line-height:1.7;">
            ${prQuality.areasForImprovement.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </td>
    </tr>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSN Weekly Report - ${weekStr}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:28px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">SSN Weekly Report</h1>
              <p style="margin:6px 0 0;color:#ccfbf1;font-size:14px;">Week ${weekStr} &middot; ${dateRange.start} to ${dateRange.end}</p>
            </td>
          </tr>

          ${execSummaryHtml}
          ${teamMetricsHtml}

          <!-- Individual Contributors -->
          <tr>
            <td style="padding:0 24px 24px;">
              <h2 style="margin:0 0 16px;font-size:16px;color:#111827;border-bottom:2px solid #0d9488;padding-bottom:8px;">Individual Contributions</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                ${userRows}
              </table>
            </td>
          </tr>

          ${codeQualityHtml}

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">SSN GitHub Reporting System &middot; Powered by GPT-4o &middot; ${new Date().toISOString().split('T')[0]}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate plain text email with AI insights
 * @param {Object} emailData - { weekStr, dateRange, comparison, enrichedData }
 * @returns {string} Plain text email
 */
export function generateEnhancedEmailText(emailData) {
  const { weekStr, dateRange, comparison, enrichedData } = emailData;
  const aiAnalysis = enrichedData?.aiAnalysis || {};
  const team = comparison.comparisons.team;
  const users = comparison.comparisons.users;
  const reviewStats = enrichedData?.reviewActivity?.stats || {};

  // Separate bots from regular users
  const allUsers = Object.entries(users);
  const botNames = ['claude', 'Copilot'];
  const regularUsers = allUsers.filter(([username]) => !botNames.includes(username));
  const botUsers = allUsers.filter(([username]) => botNames.includes(username));

  // Sort regular users alphabetically (case-insensitive)
  const sortedRegularUsers = regularUsers.sort((a, b) =>
    a[0].toLowerCase().localeCompare(b[0].toLowerCase())
  );

  // Sort bots alphabetically
  const sortedBotUsers = botUsers.sort((a, b) =>
    a[0].toLowerCase().localeCompare(b[0].toLowerCase())
  );

  // Combine: regular users first, then bots
  const sortedUsers = [...sortedRegularUsers, ...sortedBotUsers];

  const activeCount = sortedUsers.filter(([, u]) =>
    (u.commits?.current || 0) + (u.prs?.current || 0) > 0
  ).length;

  let text = `SSN WEEKLY REPORT
Week ${weekStr} | ${dateRange.start} to ${dateRange.end}
${'='.repeat(60)}

`;

  // Executive Summary
  const execSummary = aiAnalysis.executiveSummary || {};
  if (execSummary.headline) {
    text += `EXECUTIVE SUMMARY\n${'-'.repeat(40)}\n`;
    text += `${execSummary.headline}\n\n`;
    text += `${execSummary.teamHealth || ''}\n\n`;
    if (execSummary.keyInsights && execSummary.keyInsights.length > 0) {
      text += 'Key Insights:\n';
      execSummary.keyInsights.forEach(insight => {
        text += `  • ${insight}\n`;
      });
      text += '\n';
    }
  }

  // Team Metrics
  text += `TEAM METRICS\n${'-'.repeat(40)}\n`;
  text += `Commits:         ${fmt(team.commits?.current)}\n`;
  text += `Pull Requests:   ${fmt(team.prs?.current)}\n`;
  text += `Code Reviews:    ${fmt(reviewStats.totalReviews || 0)}\n`;
  text += `Lines Added:     ${fmt(team.linesAdded?.current)}\n`;
  text += `Lines Deleted:   ${fmt(team.linesDeleted?.current)}\n`;
  text += `Active Contributors: ${activeCount}\n\n`;

  // Individual Contributors
  text += `INDIVIDUAL CONTRIBUTIONS\n${'-'.repeat(40)}\n`;
  const contributorAnalysis = aiAnalysis.contributorAnalysis || {};

  const botNames = ['claude', 'Copilot'];
  for (const [username, metrics] of sortedUsers) {
    const isBot = botNames.includes(username);
    const botLabel = isBot ? ' 🤖 [Bot]' : '';
    text += `\n${username}${botLabel}\n`;
    const analysis = contributorAnalysis[username];
    if (analysis?.summary) {
      text += `  ${analysis.summary}\n`;
    }
    text += `  Commits: ${fmt(metrics.commits?.current)}, PRs: ${fmt(metrics.prs?.current)}, Reviews: ${fmt(metrics.reviewsGiven?.current || 0)}\n`;
    text += `  Lines: +${fmt(metrics.linesAdded?.current)} -${fmt(metrics.linesDeleted?.current)}\n`;
  }

  text += `\n${'='.repeat(60)}\nSSN GitHub Reporting System | Powered by GPT-4o\n`;

  return text;
}
