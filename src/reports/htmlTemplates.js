/**
 * HTML Template Generation for Dashboard
 * Uses Tailwind CSS components with compiled CSS embedded for portability
 */

import { getCompiledCSS } from '../styles/cssLoader.js';

/**
 * Generate the shared navigation menu HTML
 * @param {string} activePage - The current active page ('dashboard', 'kanban', 'open-prs')
 * @returns {string} HTML for the shared menu
 */
function generateSharedMenu(activePage = 'dashboard') {
  const pages = [
    { id: 'dashboard', href: 'dashboard.html', icon: '&#128202;', label: 'Activity Dashboard' },
    { id: 'kanban', href: 'kanban-dashboard.html', icon: '&#128203;', label: 'Kanban Board' },
    { id: 'open-prs', href: 'open-prs.html', icon: '&#128256;', label: 'Open PRs' }
  ];

  const links = pages.map(page => {
    const activeClass = page.id === activePage ? ' active' : '';
    return `<a href="${page.href}" class="menu-link${activeClass}">${page.icon} ${page.label}</a>`;
  }).join('\n        ');

  return `
    <nav class="shared-menu">
      <div class="menu-container">
        ${links}
      </div>
    </nav>`;
}

/**
 * Generate the complete HTML dashboard document
 * @param {Object} dashboardData - Data object with all dashboard information
 * @returns {string} Complete HTML document
 */
export function generateDashboard(dashboardData) {
  const content = `
    ${generateHeader(dashboardData.generatedAt, dashboardData.dateRange)}
    <div id="teamView" class="view-content">
      ${generateOverviewCards(dashboardData.teamStats, dashboardData.trends)}
      ${generateComparisonTable(dashboardData.weeks, dashboardData.comparisons)}
      ${generateTrendCharts(dashboardData.weeks, dashboardData.trends)}
      ${generateLeaderboards(dashboardData.leaderboards)}
    </div>
    <div id="personView" class="view-content" style="display: none;">
      ${generatePersonView(dashboardData.weeks)}
    </div>
  `;

  return wrapInHTMLDocument(content, dashboardData.generatedAt, dashboardData.weeks);
}

/**
 * Generate header section
 */
function generateHeader(generatedAt, dateRange) {
  const date = new Date(generatedAt);
  const formattedDate = date.toLocaleString();

  return `
    <header class="dashboard-header">
      <h1>SSN GitHub Activity Dashboard</h1>
      <p class="header-meta">
        Generated: ${formattedDate}<br>
        Reporting Period: ${dateRange.weeks} weeks
      </p>
      <div class="view-toggle">
        <button class="toggle-btn active" data-view="team">Team View</button>
        <button class="toggle-btn" data-view="person">Person View</button>
      </div>
    </header>
  `;
}

/**
 * Generate overview cards showing key metrics with trend indicators
 */
function generateOverviewCards(teamStats, trends) {
  const cards = [
    {
      title: 'Total Commits',
      value: teamStats.totalCommits.toLocaleString(),
      trend: trends?.team?.commits?.change,
      icon: '&#128221;'
    },
    {
      title: 'Pull Requests',
      value: teamStats.totalPRs.toLocaleString(),
      trend: trends?.team?.prs?.change,
      icon: '&#128256;'
    },
    {
      title: 'Lines Added',
      value: teamStats.totalLinesAdded.toLocaleString(),
      trend: trends?.team?.linesAdded?.change,
      icon: '&#128200;'
    },
    {
      title: 'Lines Deleted',
      value: teamStats.totalLinesDeleted.toLocaleString(),
      trend: trends?.team?.linesDeleted?.change,
      icon: '&#128199;'
    },
    {
      title: 'Code Churn',
      value: (teamStats.totalLinesAdded + teamStats.totalLinesDeleted).toLocaleString(),
      trend: 0,
      icon: '&#9889;'
    },
    {
      title: 'Active Contributors',
      value: teamStats.activeUsers.toLocaleString(),
      trend: 0,
      icon: '&#128101;'
    }
  ];

  let html = '<section><div class="cards-grid">';

  for (const card of cards) {
    const trendClass = getTrendClass(card.trend);
    const trendText = formatTrendText(card.trend);

    html += `
      <div class="metric-card">
        <span class="card-icon">${card.icon}</span>
        <div>
          <div class="card-title">${card.title}</div>
          <div class="card-value">${card.value}</div>
          <div class="card-trend ${trendClass}">${trendText}</div>
        </div>
      </div>
    `;
  }

  html += '</div></section>';
  return html;
}

/**
 * Generate multi-week comparison table
 */
function generateComparisonTable(weeks, comparisons) {
  let html = `
    <section>
      <h2 class="section-header">Weekly Comparison</h2>
      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Week</th>
              <th>Commits</th>
              <th>PRs</th>
              <th>Lines Added</th>
              <th>Lines Deleted</th>
              <th>Active Users</th>
            </tr>
          </thead>
          <tbody>
  `;

  const sortedWeeks = [...weeks].reverse();

  for (const week of sortedWeeks) {
    const comparison = comparisons.find(c => c.currentWeek === week.week);
    const stats = {
      week: week.week,
      commits: 0,
      prs: 0,
      linesAdded: 0,
      linesDeleted: 0,
      activeUsers: Object.keys(week.users || {}).length
    };

    for (const username in week.users) {
      const user = week.users[username];
      stats.commits += user.weekly?.commits || 0;
      stats.prs += user.weekly?.prs || 0;
      stats.linesAdded += user.weekly?.linesAdded || 0;
      stats.linesDeleted += user.weekly?.linesDeleted || 0;
    }

    const compData = comparison?.comparisons?.team || {};
    const commitChange = compData.commits?.change || 0;
    const prChange = compData.prs?.change || 0;
    const linesAddedChange = compData.linesAdded?.change || 0;

    html += `
      <tr>
        <td class="week-cell">${week.week}</td>
        <td>${stats.commits.toLocaleString()} <span class="trend-badge ${getTrendClass(commitChange)}">${formatTrendPercent(commitChange)}</span></td>
        <td>${stats.prs.toLocaleString()} <span class="trend-badge ${getTrendClass(prChange)}">${formatTrendPercent(prChange)}</span></td>
        <td>${stats.linesAdded.toLocaleString()} <span class="trend-badge ${getTrendClass(linesAddedChange)}">${formatTrendPercent(linesAddedChange)}</span></td>
        <td>${stats.linesDeleted.toLocaleString()}</td>
        <td>${stats.activeUsers}</td>
      </tr>
    `;
  }

  html += '</tbody></table></div></section>';
  return html;
}

/**
 * Generate trend charts using Chart.js
 */
function generateTrendCharts(weeks, trends) {
  const chartWeeks = weeks.slice(-10);
  const weekLabels = chartWeeks.map(w => `W${w.week}`);

  const commitData = chartWeeks.map(week => {
    let total = 0;
    for (const username in week.users) {
      total += week.users[username].weekly?.commits || 0;
    }
    return total;
  });

  const prData = chartWeeks.map(week => {
    let total = 0;
    for (const username in week.users) {
      total += week.users[username].weekly?.prs || 0;
    }
    return total;
  });

  const linesAddedData = chartWeeks.map(week => {
    let total = 0;
    for (const username in week.users) {
      total += week.users[username].weekly?.linesAdded || 0;
    }
    return total;
  });

  const linesDeletedData = chartWeeks.map(week => {
    let total = 0;
    for (const username in week.users) {
      total += week.users[username].weekly?.linesDeleted || 0;
    }
    return total;
  });

  return `
    <section>
      <h2 class="section-header">Trends</h2>
      <div class="charts-grid">
        <div class="chart-card">
          <canvas id="commitsChart"></canvas>
        </div>
        <div class="chart-card">
          <canvas id="prsChart"></canvas>
        </div>
        <div class="chart-card">
          <canvas id="linesAddedChart"></canvas>
        </div>
        <div class="chart-card">
          <canvas id="linesDeletedChart"></canvas>
        </div>
      </div>
    </section>

    <script>
      const chartConfig = {
        commits: { labels: ${JSON.stringify(weekLabels)}, data: ${JSON.stringify(commitData)} },
        prs: { labels: ${JSON.stringify(weekLabels)}, data: ${JSON.stringify(prData)} },
        linesAdded: { labels: ${JSON.stringify(weekLabels)}, data: ${JSON.stringify(linesAddedData)} },
        linesDeleted: { labels: ${JSON.stringify(weekLabels)}, data: ${JSON.stringify(linesDeletedData)} }
      };

      document.addEventListener('DOMContentLoaded', function() {
        new Chart(document.getElementById('commitsChart').getContext('2d'), {
          type: 'line',
          data: {
            labels: chartConfig.commits.labels,
            datasets: [{ label: 'Commits', data: chartConfig.commits.data, borderColor: 'rgb(38, 38, 38)', backgroundColor: 'rgba(38, 38, 38, 0.1)', tension: 0.3, fill: true }]
          },
          options: { responsive: true, maintainAspectRatio: true }
        });

        new Chart(document.getElementById('prsChart').getContext('2d'), {
          type: 'line',
          data: {
            labels: chartConfig.prs.labels,
            datasets: [{ label: 'Pull Requests', data: chartConfig.prs.data, borderColor: 'rgb(13, 148, 136)', backgroundColor: 'rgba(13, 148, 136, 0.1)', tension: 0.3, fill: true }]
          },
          options: { responsive: true, maintainAspectRatio: true }
        });

        new Chart(document.getElementById('linesAddedChart').getContext('2d'), {
          type: 'bar',
          data: {
            labels: chartConfig.linesAdded.labels,
            datasets: [{ label: 'Lines Added', data: chartConfig.linesAdded.data, backgroundColor: 'rgb(16, 185, 129)', borderColor: 'rgb(16, 185, 129)' }]
          },
          options: { responsive: true, maintainAspectRatio: true }
        });

        new Chart(document.getElementById('linesDeletedChart').getContext('2d'), {
          type: 'bar',
          data: {
            labels: chartConfig.linesDeleted.labels,
            datasets: [{ label: 'Lines Deleted', data: chartConfig.linesDeleted.data, backgroundColor: 'rgb(239, 68, 68)', borderColor: 'rgb(239, 68, 68)' }]
          },
          options: { responsive: true, maintainAspectRatio: true }
        });
      });
    </script>
  `;
}

/**
 * Generate person view with user selector and charts
 */
function generatePersonView(weeks) {
  const usernames = new Set();
  for (const week of weeks) {
    for (const username in week.users || {}) {
      usernames.add(username);
    }
  }

  const sortedUsernames = Array.from(usernames).sort();

  let html = `
    <div class="person-selector">
      <label for="personSelect">Select Person:</label>
      <select id="personSelect">
        <option value="">-- Choose a person --</option>
  `;

  for (const username of sortedUsernames) {
    html += `<option value="${username}">${username}</option>`;
  }

  html += `
      </select>
    </div>

    <div id="personContent" style="display: none;">
      <section>
        <h2 id="personName" class="section-header"></h2>
        <div class="person-cards">
          <div class="stat-card">
            <div class="stat-label">Total Commits</div>
            <div class="stat-value" id="personCommits">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total PRs</div>
            <div class="stat-value" id="personPRs">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Lines Added</div>
            <div class="stat-value" id="personLinesAdded">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Lines Deleted</div>
            <div class="stat-value" id="personLinesDeleted">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Code Churn</div>
            <div class="stat-value" id="personCodeChurn">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Net Lines Changed</div>
            <div class="stat-value" id="personNetLines">0</div>
          </div>
        </div>
      </section>

      <section>
        <h2 class="section-header">Activity Over Time</h2>
        <div class="charts-grid">
          <div class="chart-card"><canvas id="personCommitsChart"></canvas></div>
          <div class="chart-card"><canvas id="personPRsChart"></canvas></div>
          <div class="chart-card"><canvas id="personLinesAddedChart"></canvas></div>
          <div class="chart-card"><canvas id="personLinesDeletedChart"></canvas></div>
        </div>
      </section>

      <section>
        <h2 class="section-header">Daily Breakdown</h2>
        <div style="overflow-x: auto;">
          <table class="data-table daily-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Commits</th>
                <th>PRs</th>
                <th>Lines Added</th>
                <th>Lines Deleted</th>
              </tr>
            </thead>
            <tbody id="personDailyBody"></tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  return html;
}

/**
 * Generate leaderboards for top contributors
 */
function generateLeaderboards(leaderboards) {
  let html = `
    <section>
      <h2 class="section-header">Top Contributors</h2>
      <div class="leaderboards-grid">
  `;

  html += generateLeaderboard('Commits', leaderboards.byCommits || [], '&#128221;');
  html += generateLeaderboard('Pull Requests', leaderboards.byPRs || [], '&#128256;');
  html += generateLeaderboard('Lines Added', leaderboards.byLinesAdded || [], '&#128200;');
  html += generateLeaderboard('Lines Deleted', leaderboards.byLinesDeleted || [], '&#128199;');

  html += '</div></section>';
  return html;
}

/**
 * Generate a single leaderboard
 */
function generateLeaderboard(title, items, icon) {
  let html = `
    <div class="leaderboard">
      <h3>${icon} ${title}</h3>
      <ol class="leaderboard-list">
  `;

  const topTen = items.slice(0, 10);

  for (let i = 0; i < topTen.length; i++) {
    const item = topTen[i];
    const medalEmoji = i === 0 ? '&#129351;' : i === 1 ? '&#129352;' : i === 2 ? '&#129353;' : '&nbsp;&nbsp;';

    html += `
      <li class="leaderboard-item">
        <span class="medal">${medalEmoji}</span>
        <span class="username">${item.username}</span>
        <span class="value">${item.value.toLocaleString()}</span>
      </li>
    `;
  }

  html += '</ol></div>';
  return html;
}

/**
 * Wrap content in complete HTML document with embedded CSS
 */
function wrapInHTMLDocument(content, generatedAt, weeks = []) {
  const compiledCSS = getCompiledCSS();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSN GitHub Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
${compiledCSS}

    /* Header specific styles */
    .dashboard-header h1 {
      font-size: 30px;
      font-weight: 500;
      margin-bottom: 0.75rem;
    }
    .header-meta {
      opacity: 0.9;
      line-height: 1.6;
    }
    @media print {
      .shared-menu { display: none; }
    }
  </style>
</head>
<body>
  <header class="bg-brand-600">
    ${generateSharedMenu('dashboard')}
  </header>
  <div class="dashboard-container">
    <div class="dashboard-content">
      ${content}
    </div>
  </div>

  <script>
    const weeksData = ${JSON.stringify(weeks)};
    let personCharts = {};

    document.addEventListener('DOMContentLoaded', function() {
      const toggleBtns = document.querySelectorAll('.toggle-btn');
      const teamView = document.getElementById('teamView');
      const personView = document.getElementById('personView');

      toggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
          const view = this.getAttribute('data-view');
          toggleBtns.forEach(b => b.classList.remove('active'));
          this.classList.add('active');

          if (view === 'team') {
            teamView.style.display = 'block';
            personView.style.display = 'none';
          } else {
            teamView.style.display = 'none';
            personView.style.display = 'block';
          }
        });
      });

      const personSelect = document.getElementById('personSelect');
      const personContent = document.getElementById('personContent');

      personSelect.addEventListener('change', function() {
        const username = this.value;
        if (!username) {
          personContent.style.display = 'none';
          return;
        }
        displayPersonData(username);
        personContent.style.display = 'block';
      });
    });

    function displayPersonData(username) {
      let totalCommits = 0, totalPRs = 0, totalLinesAdded = 0, totalLinesDeleted = 0;
      const weeklyData = [];
      const dailyData = [];

      const sortedWeeks = [...weeksData].sort((a, b) => a.week.localeCompare(b.week));

      for (const week of sortedWeeks) {
        const user = week.users[username];
        if (!user) continue;

        const weekData = user.weekly || {};
        totalCommits += weekData.commits || 0;
        totalPRs += weekData.prs || 0;
        totalLinesAdded += weekData.linesAdded || 0;
        totalLinesDeleted += weekData.linesDeleted || 0;

        weeklyData.push({
          week: week.week,
          commits: weekData.commits || 0,
          prs: weekData.prs || 0,
          linesAdded: weekData.linesAdded || 0,
          linesDeleted: weekData.linesDeleted || 0
        });

        for (const date in (user.daily || {})) {
          const daily = user.daily[date];
          dailyData.push({ date, commits: daily.commits || 0, prs: daily.prs || 0, linesAdded: daily.linesAdded || 0, linesDeleted: daily.linesDeleted || 0 });
        }
      }

      document.getElementById('personName').textContent = username;
      document.getElementById('personCommits').textContent = totalCommits;
      document.getElementById('personPRs').textContent = totalPRs;
      document.getElementById('personLinesAdded').textContent = totalLinesAdded.toLocaleString();
      document.getElementById('personLinesDeleted').textContent = totalLinesDeleted.toLocaleString();
      document.getElementById('personCodeChurn').textContent = (totalLinesAdded + totalLinesDeleted).toLocaleString();
      document.getElementById('personNetLines').textContent = (totalLinesAdded - totalLinesDeleted).toLocaleString();

      updatePersonCharts(username, weeklyData);
      updateDailyTable(dailyData);
    }

    function updatePersonCharts(username, weeklyData) {
      const weekLabels = weeklyData.map(w => 'W' + w.week);
      const commitData = weeklyData.map(w => w.commits);
      const prData = weeklyData.map(w => w.prs);
      const linesAddedData = weeklyData.map(w => w.linesAdded);
      const linesDeletedData = weeklyData.map(w => w.linesDeleted);

      if (personCharts.commits) personCharts.commits.destroy();
      if (personCharts.prs) personCharts.prs.destroy();
      if (personCharts.linesAdded) personCharts.linesAdded.destroy();
      if (personCharts.linesDeleted) personCharts.linesDeleted.destroy();

      personCharts.commits = new Chart(document.getElementById('personCommitsChart').getContext('2d'), {
        type: 'line',
        data: { labels: weekLabels, datasets: [{ label: 'Commits', data: commitData, borderColor: 'rgb(38, 38, 38)', backgroundColor: 'rgba(38, 38, 38, 0.1)', tension: 0.3, fill: true }] },
        options: { responsive: true, maintainAspectRatio: true }
      });

      personCharts.prs = new Chart(document.getElementById('personPRsChart').getContext('2d'), {
        type: 'line',
        data: { labels: weekLabels, datasets: [{ label: 'Pull Requests', data: prData, borderColor: 'rgb(13, 148, 136)', backgroundColor: 'rgba(13, 148, 136, 0.1)', tension: 0.3, fill: true }] },
        options: { responsive: true, maintainAspectRatio: true }
      });

      personCharts.linesAdded = new Chart(document.getElementById('personLinesAddedChart').getContext('2d'), {
        type: 'bar',
        data: { labels: weekLabels, datasets: [{ label: 'Lines Added', data: linesAddedData, backgroundColor: 'rgb(16, 185, 129)', borderColor: 'rgb(16, 185, 129)' }] },
        options: { responsive: true, maintainAspectRatio: true }
      });

      personCharts.linesDeleted = new Chart(document.getElementById('personLinesDeletedChart').getContext('2d'), {
        type: 'bar',
        data: { labels: weekLabels, datasets: [{ label: 'Lines Deleted', data: linesDeletedData, backgroundColor: 'rgb(239, 68, 68)', borderColor: 'rgb(239, 68, 68)' }] },
        options: { responsive: true, maintainAspectRatio: true }
      });
    }

    function updateDailyTable(dailyData) {
      const tbody = document.getElementById('personDailyBody');
      tbody.innerHTML = '';

      const aggregated = {};
      for (const entry of dailyData) {
        if (!aggregated[entry.date]) {
          aggregated[entry.date] = { date: entry.date, commits: 0, prs: 0, linesAdded: 0, linesDeleted: 0 };
        }
        aggregated[entry.date].commits += entry.commits;
        aggregated[entry.date].prs += entry.prs;
        aggregated[entry.date].linesAdded += entry.linesAdded;
        aggregated[entry.date].linesDeleted += entry.linesDeleted;
      }

      const today = new Date();
      const allDates = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        allDates.push(date.toISOString().split('T')[0]);
      }

      const completeData = allDates.map(dateStr => aggregated[dateStr] || { date: dateStr, commits: 0, prs: 0, linesAdded: 0, linesDeleted: 0 });

      // Calculate totals for summary row
      let totalCommits = 0, totalPRs = 0, totalLinesAdded = 0, totalLinesDeleted = 0;
      for (const entry of completeData) {
        totalCommits += entry.commits;
        totalPRs += entry.prs;
        totalLinesAdded += entry.linesAdded;
        totalLinesDeleted += entry.linesDeleted;
      }

      // Add summary row at the top
      const summaryRow = tbody.insertRow();
      summaryRow.classList.add('summary-row');
      summaryRow.innerHTML = \`<td><strong>Total (30 days)</strong></td><td><strong>\${totalCommits}</strong></td><td><strong>\${totalPRs}</strong></td><td><strong>\${totalLinesAdded.toLocaleString()}</strong></td><td><strong>\${totalLinesDeleted.toLocaleString()}</strong></td>\`;

      for (const entry of completeData) {
        const row = tbody.insertRow();
        const [year, month, day] = entry.date.split('-');
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const didNoWork = entry.commits === 0 && entry.prs === 0 && entry.linesAdded === 0 && entry.linesDeleted === 0;

        row.innerHTML = \`<td>\${entry.date}</td><td>\${entry.commits}</td><td>\${entry.prs}</td><td>\${entry.linesAdded.toLocaleString()}</td><td>\${entry.linesDeleted.toLocaleString()}</td>\`;

        if (isWeekend) row.classList.add('weekend');
        if (!isWeekend && didNoWork) row.classList.add('no-work');
      }
    }
  </script>
</body>
</html>`;
}

function getTrendClass(change) {
  if (isNaN(change) || change === Infinity) return 'trend-new';
  if (change > 0) return 'trend-positive';
  if (change < 0) return 'trend-negative';
  return 'trend-neutral';
}

function formatTrendText(change) {
  if (isNaN(change) || change === Infinity) return 'New';
  if (change > 0) return `&#8593; ${change.toFixed(1)}%`;
  if (change < 0) return `&#8595; ${Math.abs(change).toFixed(1)}%`;
  return '&#8594; 0%';
}

function formatTrendPercent(change) {
  if (isNaN(change) || change === Infinity) return 'NEW';
  if (change === 0) return '&#8594;';
  if (change > 0) return `&#8593;${change.toFixed(0)}%`;
  return `&#8595;${Math.abs(change).toFixed(0)}%`;
}
