/**
 * Enhanced email template generation with AI insights
 * Layout: Header → Individual Sections (with stacked bar charts) → Team Metrics → Project Trend → Code Quality → Footer
 * Produces table-based HTML email (inline CSS, no JS, 600px max-width) and plain text fallback
 */

import { calculateContributionScoreBreakdown } from '../ai/contributorAnalyzer.js';

// ─── Helpers ───

function fmt(num) {
  return (num || 0).toLocaleString('en-US');
}

function getTrend(metric) {
  if (!metric || metric.isNoData) return { arrow: '', color: '#6b7280', label: '' };
  if (metric.isNew) return { arrow: '★', color: '#0d9488', label: 'NEW' };
  if (metric.isInactive) return { arrow: '↓', color: '#dc2626', label: '-100%' };
  if (metric.change > 0) return { arrow: '↑', color: '#0d9488', label: `+${metric.change}%` };
  if (metric.change < 0) return { arrow: '↓', color: '#dc2626', label: `${metric.change}%` };
  return { arrow: '→', color: '#6b7280', label: '0%' };
}

function trendHtml(metric) {
  const t = getTrend(metric);
  if (!t.label) return '';
  return ` <span style="color:${t.color};font-size:12px;">${t.arrow} ${t.label}</span>`;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const BOT_NAMES = ['claude', 'Copilot'];

function isBot(username) {
  return BOT_NAMES.includes(username) || username.endsWith('[bot]');
}

// ─── Stacked Bar Chart (email-safe, table-based) ───

const BAR_COLORS = {
  commits: '#0d9488',
  prs: '#3b82f6',
  reviews: '#f59e0b',
  code: '#8b5cf6'
};

/**
 * Generate a stacked bar chart as nested HTML tables
 * @param {Array} weeklyScores - Array of { week, commits, prs, reviews, code, total }
 * @param {number} maxScore - Max score across all bars for normalization
 * @returns {string} HTML table rows
 */
function generateStackedBar(weeklyScores, maxScore) {
  if (!weeklyScores || weeklyScores.length === 0) return '';

  const barRows = weeklyScores.map(entry => {
    const total = entry.total || 0;
    if (total === 0 || maxScore === 0) {
      return `
        <tr>
          <td width="50" style="font-size:11px;color:#6b7280;padding:2px 4px;white-space:nowrap;">${escapeHtml(entry.week)}</td>
          <td style="padding:2px 0;">
            <div style="background:#f3f4f6;height:14px;border-radius:2px;width:100%;"></div>
          </td>
          <td width="35" style="font-size:11px;font-weight:600;color:#9ca3af;padding:2px 4px;text-align:right;">0</td>
        </tr>`;
    }

    const barWidth = Math.max(Math.round((total / maxScore) * 100), 5);
    const segments = [
      { key: 'commits', value: entry.commits },
      { key: 'prs', value: entry.prs },
      { key: 'reviews', value: entry.reviews },
      { key: 'code', value: entry.code }
    ].filter(s => s.value > 0);

    const segmentCells = segments.map(s => {
      const pct = Math.max(Math.round((s.value / total) * 100), 1);
      return `<td style="background:${BAR_COLORS[s.key]};height:14px;width:${pct}%;" title="${s.key}: ${Math.round(s.value)} pts"></td>`;
    }).join('');

    // Build tooltip text with raw counts if available
    const tooltip = entry.rawCommits !== undefined
      ? `${entry.week} — ${entry.rawCommits} commits, ${entry.rawPRs} PRs, ${entry.rawReviews} reviews, ${entry.rawComments} comments, ${fmt(entry.rawLinesAdded)}+ ${fmt(entry.rawLinesDeleted)}- lines — Score: ${Math.round(total)}`
      : `${entry.week} — Commits: ${Math.round(entry.commits)}, PRs: ${Math.round(entry.prs)}, Reviews: ${Math.round(entry.reviews)}, Code: ${Math.round(entry.code)} — Total: ${Math.round(total)}`;

    return `
      <tr title="${escapeHtml(tooltip)}">
        <td width="50" style="font-size:11px;color:#6b7280;padding:2px 4px;white-space:nowrap;">${escapeHtml(entry.week)}</td>
        <td style="padding:2px 0;">
          <table cellpadding="0" cellspacing="0" style="width:${barWidth}%;border-radius:2px;overflow:hidden;" title="${escapeHtml(tooltip)}">
            <tr>${segmentCells}</tr>
          </table>
        </td>
        <td width="35" style="font-size:11px;font-weight:600;color:#374151;padding:2px 4px;text-align:right;">${Math.round(total)}</td>
      </tr>`;
  }).join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;">
      ${barRows}
    </table>`;
}

/**
 * Generate the color legend for stacked bars
 */
function generateColorLegend() {
  const items = [
    { color: BAR_COLORS.commits, label: 'Commits' },
    { color: BAR_COLORS.prs, label: 'PRs' },
    { color: BAR_COLORS.reviews, label: 'Reviews' },
    { color: BAR_COLORS.code, label: 'Code' }
  ];

  const legendCells = items.map(item =>
    `<td style="padding:0 8px 0 0;font-size:10px;color:#6b7280;">
      <span style="display:inline-block;width:10px;height:10px;background:${item.color};border-radius:2px;vertical-align:middle;margin-right:3px;"></span>
      ${item.label}
    </td>`
  ).join('');

  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>${legendCells}</tr></table>`;
}

/**
 * Generate a horizontal divider between person sections
 */
function generatePersonDivider() {
  return `
    <tr>
      <td style="padding:0 24px;">
        <div style="border-top:1px solid #e5e7eb;margin:4px 0;"></div>
      </td>
    </tr>`;
}

// ─── Per-Person Section ───

/**
 * Generate an individual person section with chart + summary + metrics
 */
function generatePersonSection(username, currentMetrics, aiSummary, weeklyScores, maxScore, enrichedData) {
  const botBadge = isBot(username)
    ? ' <span style="font-size:11px;background-color:#e2e8f0;padding:2px 6px;border-radius:3px;margin-left:6px;">🤖 Bot</span>'
    : '';
  const nameColor = isBot(username) ? '#64748b' : '#111827';

  // Get review metrics from enriched data if available
  const reviewActivity = enrichedData?.reviewActivity;
  const userReviews = reviewActivity?.reviews?.filter(r => r.reviewer === username).length || 0;
  const userReviewComments = reviewActivity?.reviewComments?.filter(c => c.author === username).length || 0;
  const userDiscussionComments = reviewActivity?.discussionComments?.filter(c => c.author === username).length || 0;

  // For bots: compact format (no chart, just metrics)
  if (isBot(username)) {
    return `
      <tr>
        <td style="padding:12px 24px;">
          <div style="font-weight:600;color:${nameColor};margin-bottom:6px;">${escapeHtml(username)}${botBadge}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:2px 8px;text-align:center;font-size:13px;">
                <div style="font-weight:600;color:#0f766e;">${fmt(currentMetrics.commits?.current)}</div>
                <div style="font-size:11px;color:#9ca3af;">Commits</div>
              </td>
              <td style="padding:2px 8px;text-align:center;font-size:13px;">
                <div style="font-weight:600;color:#0f766e;">${fmt(currentMetrics.prs?.current)}</div>
                <div style="font-size:11px;color:#9ca3af;">PRs</div>
              </td>
              <td style="padding:2px 8px;text-align:center;font-size:13px;">
                <div style="font-weight:600;color:#0d9488;">${fmt(currentMetrics.linesAdded?.current)}</div>
                <div style="font-size:11px;color:#9ca3af;">Lines+</div>
              </td>
              <td style="padding:2px 8px;text-align:center;font-size:13px;">
                <div style="font-weight:600;color:#dc2626;">${fmt(currentMetrics.linesDeleted?.current)}</div>
                <div style="font-size:11px;color:#9ca3af;">Lines-</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }

  // Regular contributor: full section with chart
  const chartHtml = generateStackedBar(weeklyScores, maxScore);
  const summaryText = aiSummary?.summary || '';

  return `
    <tr>
      <td style="padding:16px 24px 12px;">
        <div style="font-weight:700;font-size:15px;color:${nameColor};margin-bottom:8px;">${escapeHtml(username)}${botBadge}</div>
        ${chartHtml ? `
        <div style="margin-bottom:10px;">
          ${chartHtml}
        </div>` : ''}
        ${summaryText ? `<div style="font-size:13px;color:#4b5563;line-height:1.6;margin-bottom:10px;padding:8px 12px;background:#f9fafb;border-radius:4px;border-left:3px solid #0d9488;">${escapeHtml(summaryText)}</div>` : ''}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:2px 6px;text-align:center;font-size:13px;">
              <div style="font-weight:600;color:#0f766e;">${fmt(currentMetrics.commits?.current)}</div>
              <div style="font-size:11px;color:#9ca3af;">Commits${trendHtml(currentMetrics.commits)}</div>
            </td>
            <td style="padding:2px 6px;text-align:center;font-size:13px;">
              <div style="font-weight:600;color:#0f766e;">${fmt(currentMetrics.prs?.current)}</div>
              <div style="font-size:11px;color:#9ca3af;">PRs${trendHtml(currentMetrics.prs)}</div>
            </td>
            <td style="padding:2px 6px;text-align:center;font-size:13px;">
              <div style="font-weight:600;color:#92400e;">${fmt(userReviews)}</div>
              <div style="font-size:11px;color:#9ca3af;">Reviews</div>
            </td>
            <td style="padding:2px 6px;text-align:center;font-size:13px;">
              <div style="font-weight:600;color:#92400e;">${fmt(userReviewComments + userDiscussionComments)}</div>
              <div style="font-size:11px;color:#9ca3af;">Comments</div>
            </td>
            <td style="padding:2px 6px;text-align:center;font-size:13px;">
              <div style="font-weight:600;color:#0d9488;">${fmt(currentMetrics.linesAdded?.current)}</div>
              <div style="font-size:11px;color:#9ca3af;">Lines+${trendHtml(currentMetrics.linesAdded)}</div>
            </td>
            <td style="padding:2px 6px;text-align:center;font-size:13px;">
              <div style="font-weight:600;color:#dc2626;">${fmt(currentMetrics.linesDeleted?.current)}</div>
              <div style="font-size:11px;color:#9ca3af;">Lines-${trendHtml(currentMetrics.linesDeleted)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─── Repository Activity Section ───

function generateRepositoryActivitySection(repositoriesData) {
  if (!repositoriesData || Object.keys(repositoriesData).length === 0) {
    return '';
  }

  // Build per-repo contribution scores per week
  const repoScores = {};
  let globalMaxScore = 1;

  for (const [repo, weekEntries] of Object.entries(repositoriesData)) {
    const scores = weekEntries.map(entry => {
      const breakdown = calculateContributionScoreBreakdown({
        commits: entry.commits,
        prs: entry.prs,
        linesAdded: entry.linesAdded,
        linesDeleted: entry.linesDeleted,
        reviewsGiven: entry.reviewsGiven || 0,
        reviewCommentsGiven: entry.reviewCommentsGiven || 0
      });
      return {
        week: entry.week,
        ...breakdown,
        rawCommits: entry.commits,
        rawPRs: entry.prs,
        rawReviews: entry.reviewsGiven || 0
      };
    });
    repoScores[repo] = scores;
    const repoMax = Math.max(...scores.map(s => s.total), 0);
    if (repoMax > globalMaxScore) globalMaxScore = repoMax;
  }

  // Build HTML rows per repo
  const repoRows = Object.entries(repoScores)
    .sort(([repoA], [repoB]) => repoA.localeCompare(repoB))
    .map(([repo, scores]) => {
      const repoLabel = repo.split('/')[1]; // Just the repo name, not owner/repo
      return `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:12px 24px;">
        <div style="font-weight:600;color:#111827;margin-bottom:8px;font-size:14px;">${escapeHtml(repoLabel)}</div>
        ${generateStackedBar(scores, globalMaxScore)}
      </td>
    </tr>`;
    }).join('');

  return `
    <tr>
      <td style="padding:24px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:0 24px 8px;">
              <h2 style="margin:0 0 4px;font-size:16px;color:#111827;border-bottom:2px solid #0d9488;padding-bottom:8px;">Repository Activity</h2>
              <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">Per-repository contribution scores over time</p>
              <div style="margin:8px 0 4px;">${generateColorLegend()}</div>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
          ${repoRows}
        </table>
      </td>
    </tr>`;
}

// ─── Team Trend Section ───

function generateTeamTrendSection(multiWeekData) {
  if (!multiWeekData || !multiWeekData.team || multiWeekData.team.length === 0) {
    return '';
  }

  // Build team-level contribution scores per week
  const teamScores = multiWeekData.team.map(weekTeam => {
    const breakdown = calculateContributionScoreBreakdown({
      commits: weekTeam.commits,
      prs: weekTeam.prs,
      linesAdded: weekTeam.linesAdded,
      linesDeleted: weekTeam.linesDeleted,
      reviewsGiven: weekTeam.reviewsGiven || 0,
      reviewCommentsGiven: weekTeam.reviewCommentsGiven || 0
    });
    return { week: weekTeam.week, ...breakdown };
  });

  const maxScore = Math.max(...teamScores.map(s => s.total), 1);
  const chartHtml = generateStackedBar(teamScores, maxScore);

  return `
    <tr>
      <td style="padding:24px 24px 16px;">
        <h2 style="margin:0 0 8px;font-size:16px;color:#111827;border-bottom:2px solid #0d9488;padding-bottom:8px;">Project Trend</h2>
        <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">Team aggregate contribution scores over time</p>
        ${chartHtml}
        <div style="margin-top:6px;">${generateColorLegend()}</div>
      </td>
    </tr>`;
}

// ─── Main HTML Generator ───

/**
 * Generate enhanced HTML email with new layout:
 * Header → Individual Sections → Team Metrics → Project Trend → Code Quality → Footer
 */
export function generateEnhancedEmailHTML(emailData) {
  const { weekStr, dateRange, comparison, enrichedData, multiWeekData, repositoriesData } = emailData;
  const aiAnalysis = enrichedData?.aiAnalysis || {};
  const team = comparison.comparisons.team;
  const users = comparison.comparisons.users;

  // Separate bots from regular users
  const allUsers = Object.entries(users);
  const regularUsers = allUsers.filter(([username]) => !isBot(username));
  const botUsers = allUsers.filter(([username]) => isBot(username));

  const sortedRegularUsers = regularUsers.sort((a, b) =>
    a[0].toLowerCase().localeCompare(b[0].toLowerCase())
  );
  const sortedBotUsers = botUsers.sort((a, b) =>
    a[0].toLowerCase().localeCompare(b[0].toLowerCase())
  );

  // Build per-user weekly scores for stacked bars
  const contributorAnalysis = aiAnalysis.contributorAnalysis || {};
  const userWeeklyScores = {};
  let globalMaxScore = 1;

  if (multiWeekData && multiWeekData.users) {
    for (const username of Object.keys(multiWeekData.users)) {
      const weekEntries = multiWeekData.users[username];
      const scores = weekEntries.map(entry => {
        const breakdown = calculateContributionScoreBreakdown({
          commits: entry.commits,
          prs: entry.prs,
          linesAdded: entry.linesAdded,
          linesDeleted: entry.linesDeleted,
          reviewsGiven: entry.reviewsGiven || 0,
          reviewCommentsGiven: entry.reviewCommentsGiven || 0
        });
        return {
          week: entry.week,
          ...breakdown,
          // Raw counts for tooltip
          rawCommits: entry.commits,
          rawPRs: entry.prs,
          rawReviews: entry.reviewsGiven || 0,
          rawComments: entry.reviewCommentsGiven || 0,
          rawLinesAdded: entry.linesAdded,
          rawLinesDeleted: entry.linesDeleted
        };
      });
      userWeeklyScores[username] = scores;
      const userMax = Math.max(...scores.map(s => s.total), 0);
      if (userMax > globalMaxScore) globalMaxScore = userMax;
    }
  }

  // Individual sections HTML
  const regularUserSections = sortedRegularUsers.map(([username, metrics], i) => {
    const section = generatePersonSection(
      username, metrics,
      contributorAnalysis[username],
      userWeeklyScores[username] || [],
      globalMaxScore,
      enrichedData
    );
    const divider = i < sortedRegularUsers.length - 1 ? generatePersonDivider() : '';
    return section + divider;
  }).join('');

  // Repository Activity section
  const repositoryActivityHtml = generateRepositoryActivitySection(repositoriesData);

  // Bots excluded from email report

  // Team Metrics section
  const reviewStats = enrichedData?.reviewActivity?.stats || {};
  const activeCount = allUsers.filter(([, u]) =>
    (u.commits?.current || 0) + (u.prs?.current || 0) > 0
  ).length;

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
    </tr>`;

  // Code Quality Insights
  const prQuality = aiAnalysis.prQualityAnalysis || {};
  const codeQualityHtml = prQuality.overallQuality ? `
    <tr>
      <td style="padding:0 24px 24px;">
        <h2 style="margin:0 0 16px;font-size:16px;color:#111827;border-bottom:2px solid #0d9488;padding-bottom:8px;">Code Quality &amp; Collaboration</h2>
        <p style="margin:0 0 12px;color:#374151;line-height:1.6;"><strong>Overall:</strong> ${escapeHtml(prQuality.overallQuality)}</p>
        ${prQuality.positivePatterns && prQuality.positivePatterns.length > 0 ? `
        <div style="margin-bottom:12px;">
          <p style="margin:0 0 6px;font-weight:600;color:#059669;font-size:14px;">Strengths:</p>
          <ul style="margin:0;padding-left:20px;color:#374151;line-height:1.7;">
            ${prQuality.positivePatterns.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
          </ul>
        </div>` : ''}
        ${prQuality.areasForImprovement && prQuality.areasForImprovement.length > 0 ? `
        <div>
          <p style="margin:0 0 6px;font-weight:600;color:#d97706;font-size:14px;">Growth Opportunities:</p>
          <ul style="margin:0;padding-left:20px;color:#374151;line-height:1.7;">
            ${prQuality.areasForImprovement.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
          </ul>
        </div>` : ''}
      </td>
    </tr>` : '';

  // Model attribution
  const models = aiAnalysis.model || 'GPT-4o';
  const modelLabel = typeof models === 'string' ? models : `${enrichedData?.aiAnalysis?.model || 'GPT-4o'}`;

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

          <!-- Individual Contributions (promoted to top) -->
          <tr>
            <td style="padding:24px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 24px 8px;">
                    <h2 style="margin:0 0 4px;font-size:16px;color:#111827;border-bottom:2px solid #0d9488;padding-bottom:8px;">Individual Contributions</h2>
                    <div style="margin:8px 0 4px;">${generateColorLegend()}</div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${regularUserSections}
              </table>
            </td>
          </tr>

          <!-- Repository Activity -->
          ${repositoryActivityHtml}

          ${teamMetricsHtml}

          ${generateTeamTrendSection(multiWeekData)}

          ${codeQualityHtml}

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">SSN GitHub Reporting System &middot; Powered by ${escapeHtml(modelLabel)} &middot; ${new Date().toISOString().split('T')[0]}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Plain Text Generator ───

/**
 * Generate plain text email matching the new layout order
 */
export function generateEnhancedEmailText(emailData) {
  const { weekStr, dateRange, comparison, enrichedData, multiWeekData, repositoriesData } = emailData;
  const aiAnalysis = enrichedData?.aiAnalysis || {};
  const team = comparison.comparisons.team;
  const users = comparison.comparisons.users;
  const reviewStats = enrichedData?.reviewActivity?.stats || {};

  const allUsers = Object.entries(users);
  const regularUsers = allUsers.filter(([username]) => !isBot(username));
  const botUsersArr = allUsers.filter(([username]) => isBot(username));

  const sortedRegularUsers = regularUsers.sort((a, b) =>
    a[0].toLowerCase().localeCompare(b[0].toLowerCase())
  );
  const sortedBotUsers = botUsersArr.sort((a, b) =>
    a[0].toLowerCase().localeCompare(b[0].toLowerCase())
  );

  const contributorAnalysis = aiAnalysis.contributorAnalysis || {};

  let text = `SSN WEEKLY REPORT
Week ${weekStr} | ${dateRange.start} to ${dateRange.end}
${'='.repeat(60)}

`;

  // Individual Contributions (top)
  text += `INDIVIDUAL CONTRIBUTIONS\n${'-'.repeat(40)}\n`;

  // Build per-user scores for ASCII bars
  let globalMax = 1;
  const userScoreMap = {};
  if (multiWeekData && multiWeekData.users) {
    for (const [username, entries] of Object.entries(multiWeekData.users)) {
      const scores = entries.map(entry => {
        const bd = calculateContributionScoreBreakdown({
          commits: entry.commits, prs: entry.prs,
          linesAdded: entry.linesAdded, linesDeleted: entry.linesDeleted,
          reviewsGiven: entry.reviewsGiven || 0,
          reviewCommentsGiven: entry.reviewCommentsGiven || 0
        });
        return { week: entry.week, total: bd.total };
      });
      userScoreMap[username] = scores;
      const mx = Math.max(...scores.map(s => s.total), 0);
      if (mx > globalMax) globalMax = mx;
    }
  }

  for (const [username, metrics] of sortedRegularUsers) {
    text += `\n${username}\n`;

    // ASCII bar chart
    const scores = userScoreMap[username];
    if (scores && scores.length > 0) {
      for (const s of scores) {
        const barLen = Math.round((s.total / globalMax) * 20);
        const bar = '\u2588'.repeat(barLen) + '\u2591'.repeat(20 - barLen);
        text += `  ${s.week} ${bar} ${Math.round(s.total)}\n`;
      }
    }

    const analysis = contributorAnalysis[username];
    if (analysis?.summary) {
      text += `  ${analysis.summary}\n`;
    }
    text += `  Commits: ${fmt(metrics.commits?.current)}, PRs: ${fmt(metrics.prs?.current)}\n`;
    text += `  Lines: +${fmt(metrics.linesAdded?.current)} -${fmt(metrics.linesDeleted?.current)}\n`;
  }

  // Repository Activity
  if (repositoriesData && Object.keys(repositoriesData).length > 0) {
    text += `\nREPOSITORY ACTIVITY\n${'-'.repeat(40)}\n`;

    // Calculate repo scores
    const sortedRepos = Object.entries(repositoriesData)
      .sort(([repoA], [repoB]) => repoA.localeCompare(repoB));

    for (const [repo, weekEntries] of sortedRepos) {
      const repoLabel = repo.split('/')[1]; // Just repo name
      text += `\n${repoLabel}\n`;

      if (weekEntries && weekEntries.length > 0) {
        // Show summary of latest week data
        const latest = weekEntries[weekEntries.length - 1];
        text += `  Commits: ${fmt(latest.commits || 0)}, PRs: ${fmt(latest.prs || 0)}, Reviews: ${fmt(latest.reviewsGiven || 0)}\n`;
      }
    }
  }

  // Team Metrics
  text += `\nTEAM METRICS\n${'-'.repeat(40)}\n`;
  text += `Commits:         ${fmt(team.commits?.current)}\n`;
  text += `Pull Requests:   ${fmt(team.prs?.current)}\n`;
  text += `Code Reviews:    ${fmt(reviewStats.totalReviews || 0)}\n`;
  text += `Lines Added:     ${fmt(team.linesAdded?.current)}\n`;
  text += `Lines Deleted:   ${fmt(team.linesDeleted?.current)}\n`;

  // Code Quality
  const prQuality = aiAnalysis.prQualityAnalysis || {};
  if (prQuality.overallQuality) {
    text += `\nCODE QUALITY & COLLABORATION\n${'-'.repeat(40)}\n`;
    text += `${prQuality.overallQuality}\n`;
    if (prQuality.positivePatterns?.length) {
      text += 'Strengths:\n';
      prQuality.positivePatterns.forEach(p => { text += `  + ${p}\n`; });
    }
    if (prQuality.areasForImprovement?.length) {
      text += 'Growth Opportunities:\n';
      prQuality.areasForImprovement.forEach(a => { text += `  > ${a}\n`; });
    }
  }

  const modelLabel = aiAnalysis.model || 'GPT-4o';
  text += `\n${'='.repeat(60)}\nSSN GitHub Reporting System | Powered by ${modelLabel}\n`;

  return text;
}
