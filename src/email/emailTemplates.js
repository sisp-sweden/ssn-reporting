/**
 * Email template generation for weekly reports
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
 * @param {Object} metric - { current, previous, change, isNew, isInactive, isNoData }
 * @returns {Object} { arrow, color, label }
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
 * Generate trend HTML snippet for inline use
 */
function trendHtml(metric) {
  const t = getTrend(metric);
  if (!t.label) return '';
  return ` <span style="color:${t.color};font-size:12px;">${t.arrow} ${t.label}</span>`;
}

/**
 * Generate trend text for plain text email
 */
function trendText(metric) {
  const t = getTrend(metric);
  if (!t.label) return '';
  return ` (${t.arrow} ${t.label})`;
}

/**
 * Generate the full HTML email
 * @param {Object} emailData - { weekStr, dateRange, comparison, hasPreviousWeek }
 * @returns {string} Complete HTML email
 */
export function generateEmailHTML(emailData) {
  const { weekStr, dateRange, comparison } = emailData;
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

  // Build user rows
  const botNames = ['claude', 'Copilot'];
  const userRows = sortedUsers.map(([username, metrics], i) => {
    const isBot = botNames.includes(username);
    const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    const borderTop = isBot && i === sortedRegularUsers.length ? 'border-top:2px solid #64748b;' : '';
    const nameColor = isBot ? '#64748b' : '#111827';
    const botBadge = isBot ? ' <span style="font-size:11px;background-color:#e2e8f0;color:#64748b;padding:2px 6px;border-radius:3px;margin-left:6px;">🤖 Bot</span>' : '';

    return `
      <tr style="background-color:${bgColor};${borderTop}">
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:500;color:${nameColor};">${username}${botBadge}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${fmt(metrics.commits?.current)}${trendHtml(metrics.commits)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${fmt(metrics.prs?.current)}${trendHtml(metrics.prs)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#0d9488;">${fmt(metrics.linesAdded?.current)}${trendHtml(metrics.linesAdded)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#dc2626;">${fmt(metrics.linesDeleted?.current)}${trendHtml(metrics.linesDeleted)}</td>
      </tr>`;
  }).join('');

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

          <!-- Executive Summary -->
          <tr>
            <td style="padding:24px;">
              <h2 style="margin:0 0 16px;font-size:16px;color:#111827;border-bottom:2px solid #0d9488;padding-bottom:8px;">Executive Summary</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdfa;border-radius:6px;padding:16px;">
                      <tr><td style="padding:12px;text-align:center;">
                        <div style="font-size:28px;font-weight:700;color:#0f766e;">${fmt(team.commits?.current)}</div>
                        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Commits${trendHtml(team.commits)}</div>
                      </td></tr>
                    </table>
                  </td>
                  <td width="50%" style="padding:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdfa;border-radius:6px;padding:16px;">
                      <tr><td style="padding:12px;text-align:center;">
                        <div style="font-size:28px;font-weight:700;color:#0f766e;">${fmt(team.prs?.current)}</div>
                        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Pull Requests${trendHtml(team.prs)}</div>
                      </td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdfa;border-radius:6px;padding:16px;">
                      <tr><td style="padding:12px;text-align:center;">
                        <div style="font-size:28px;font-weight:700;color:#0d9488;">${fmt(team.linesAdded?.current)}</div>
                        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Lines Added${trendHtml(team.linesAdded)}</div>
                      </td></tr>
                    </table>
                  </td>
                  <td width="50%" style="padding:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:6px;padding:16px;">
                      <tr><td style="padding:12px;text-align:center;">
                        <div style="font-size:28px;font-weight:700;color:#dc2626;">${fmt(team.linesDeleted?.current)}</div>
                        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Lines Deleted${trendHtml(team.linesDeleted)}</div>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0;font-size:13px;color:#6b7280;text-align:center;">${activeCount} active contributor${activeCount !== 1 ? 's' : ''} this week</p>
            </td>
          </tr>

          <!-- Individual Performance -->
          <tr>
            <td style="padding:0 24px 24px;">
              <h2 style="margin:0 0 16px;font-size:16px;color:#111827;border-bottom:2px solid #0d9488;padding-bottom:8px;">Individual Performance</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                <tr style="background-color:#f9fafb;">
                  <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">Contributor</th>
                  <th style="padding:10px 12px;text-align:center;font-size:13px;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">Commits</th>
                  <th style="padding:10px 12px;text-align:center;font-size:13px;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">PRs</th>
                  <th style="padding:10px 12px;text-align:center;font-size:13px;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">Lines+</th>
                  <th style="padding:10px 12px;text-align:center;font-size:13px;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">Lines-</th>
                </tr>
                ${userRows}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">SSN GitHub Reporting System &middot; Generated ${new Date().toISOString().split('T')[0]}</p>
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
 * Generate plain text email fallback
 * @param {Object} emailData - { weekStr, dateRange, comparison, hasPreviousWeek }
 * @returns {string} Plain text email
 */
export function generateEmailText(emailData) {
  const { weekStr, dateRange, comparison } = emailData;
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

  let text = `SSN WEEKLY REPORT
Week ${weekStr} | ${dateRange.start} to ${dateRange.end}
${'='.repeat(50)}

EXECUTIVE SUMMARY
${'-'.repeat(30)}
Commits:       ${fmt(team.commits?.current)}${trendText(team.commits)}
Pull Requests: ${fmt(team.prs?.current)}${trendText(team.prs)}
Lines Added:   ${fmt(team.linesAdded?.current)}${trendText(team.linesAdded)}
Lines Deleted: ${fmt(team.linesDeleted?.current)}${trendText(team.linesDeleted)}
Active Contributors: ${activeCount}

INDIVIDUAL PERFORMANCE
${'-'.repeat(30)}
`;

  const botNames = ['claude', 'Copilot'];
  for (const [username, metrics] of sortedUsers) {
    const isBot = botNames.includes(username);
    const botLabel = isBot ? ' 🤖 [Bot]' : '';
    text += `\n${username}${botLabel}\n`;
    text += `  Commits: ${fmt(metrics.commits?.current)}${trendText(metrics.commits)}\n`;
    text += `  PRs:     ${fmt(metrics.prs?.current)}${trendText(metrics.prs)}\n`;
    text += `  Lines+:  ${fmt(metrics.linesAdded?.current)}${trendText(metrics.linesAdded)}\n`;
    text += `  Lines-:  ${fmt(metrics.linesDeleted?.current)}${trendText(metrics.linesDeleted)}\n`;
  }

  text += `\n${'='.repeat(50)}\nSSN GitHub Reporting System | Generated ${new Date().toISOString().split('T')[0]}\n`;

  return text;
}
