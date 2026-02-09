import { calculateOpenPRStats, calculatePRAge } from './openPrsCollector.js';
import { getCompiledCSS } from '../styles/cssLoader.js';

/**
 * Generate the shared navigation menu HTML
 * @param {string} activePage - The current active page ('dashboard', 'kanban', 'open-prs')
 * @returns {string} HTML for the shared menu
 */
export function generateSharedMenu(activePage = 'open-prs') {
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
 * Generate the complete Open PRs dashboard HTML
 * @param {Array} prs - Array of open PRs
 * @returns {string} Complete HTML document
 */
export function generateOpenPRsPage(prs) {
  const stats = calculateOpenPRStats(prs);
  const generatedAt = new Date().toISOString();
  const compiledCSS = getCompiledCSS();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Open Pull Requests - SSN Dashboard</title>
  <style>
${compiledCSS}

    /* Additional utilities and page-specific styles */
    .hidden { display: none; }

    /* PR-specific styles */
    .pr-link {
      @apply text-brand-600 no-underline font-medium;
    }
    .pr-link:hover {
      text-decoration: underline;
    }

    .pr-number {
      @apply text-subtext-color text-caption ml-2;
    }

    .draft-badge {
      @apply bg-neutral-500 text-white text-caption px-2 py-0.5 rounded-sm ml-2 uppercase font-semibold;
    }

    .label {
      @apply px-2 py-0.5 rounded-full text-caption font-medium;
    }

    .reviewer {
      @apply bg-blue-100 text-brand-600 px-2 py-0.5 rounded-full text-caption;
    }

    .no-reviewers {
      @apply text-subtext-color italic text-caption;
    }

    .age-new { @apply text-success-600; }
    .age-moderate { @apply text-warning-600; }
    .age-old { @apply text-error-600 font-semibold; }

    .repo-badge {
      @apply bg-neutral-100 text-neutral-700 px-2 py-1 rounded-sm text-caption font-medium;
    }

    .hide-mobile {
      @media (max-width: 767px) {
        display: none;
      }
    }

    @media print {
      .shared-menu { display: none; }
    }
  </style>
</head>
<body class="min-h-screen">
  <header class="bg-brand-600 text-white">
    <div class="max-w-7xl mx-auto px-5 py-8">
      <h1 class="text-heading-1 font-medium mb-2">&#128256; Open Pull Requests</h1>
      <div class="text-body opacity-90">
        Generated: ${new Date(generatedAt).toLocaleString()} | ${stats.totalPRs} open PRs across ${stats.reposWithOpenPRs} repositories
      </div>
    </div>
    ${generateSharedMenu('open-prs')}
  </header>

  <main class="max-w-7xl mx-auto px-5 py-8">
    ${generateOverviewCards(stats)}
    ${generatePRTable(prs)}
  </main>

  <script>
    // Sorting functionality
    let currentSort = { column: 'age', direction: 'desc' };
    const tableData = ${JSON.stringify(prs.map(pr => ({
      ...pr,
      ageDays: calculatePRAge(pr.createdAt).days
    })))};

    function sortTable(column) {
      const table = document.querySelector('.pr-table tbody');
      const headers = document.querySelectorAll('.pr-table th');

      if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = column;
        currentSort.direction = column === 'age' ? 'desc' : 'asc';
      }

      headers.forEach(th => {
        th.classList.remove('sorted');
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.innerHTML = '&#8597;';
      });

      const currentHeader = document.querySelector(\`th[data-column="\${column}"]\`);
      if (currentHeader) {
        currentHeader.classList.add('sorted');
        const icon = currentHeader.querySelector('.sort-icon');
        if (icon) icon.innerHTML = currentSort.direction === 'asc' ? '&#8593;' : '&#8595;';
      }

      const sorted = [...tableData].sort((a, b) => {
        let valA, valB;

        switch (column) {
          case 'repo':
            valA = a.repoShort.toLowerCase();
            valB = b.repoShort.toLowerCase();
            break;
          case 'author':
            valA = a.author.toLowerCase();
            valB = b.author.toLowerCase();
            break;
          case 'title':
            valA = a.title.toLowerCase();
            valB = b.title.toLowerCase();
            break;
          case 'age':
            valA = a.ageDays;
            valB = b.ageDays;
            break;
          default:
            return 0;
        }

        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
      });

      table.innerHTML = sorted.map(pr => generateRow(pr)).join('');
    }

    function generateRow(pr) {
      const ageClass = pr.ageDays < 3 ? 'age-new' : (pr.ageDays < 7 ? 'age-moderate' : 'age-old');
      const ageText = pr.ageDays === 0 ? 'Today' : (pr.ageDays === 1 ? '1 day' : pr.ageDays + ' days');
      const draftBadge = pr.isDraft ? '<span class="draft-badge">Draft</span>' : '';

      const labels = pr.labels.map(l =>
        \`<span class="label" style="background: #\${l.color}20; color: #\${l.color}; border: 1px solid #\${l.color}40;">\${l.name}</span>\`
      ).join('');

      const reviewers = pr.requestedReviewers.length > 0
        ? pr.requestedReviewers.map(r => \`<span class="reviewer">\${r}</span>\`).join('')
        : '<span class="no-reviewers">None</span>';

      return \`
        <tr class="hover:bg-neutral-50">
          <td class="p-3 border-b border-neutral-200"><span class="repo-badge">\${pr.repoShort}</span></td>
          <td class="p-3 border-b border-neutral-200">\${pr.author}</td>
          <td class="p-3 border-b border-neutral-200">
            <a href="\${pr.url}" target="_blank" class="pr-link">\${pr.title}</a>
            <span class="pr-number">#\${pr.number}</span>
            \${draftBadge}
          </td>
          <td class="p-3 border-b border-neutral-200 hide-mobile"><div class="flex flex-wrap gap-1">\${labels || '<span class="no-reviewers">None</span>'}</div></td>
          <td class="p-3 border-b border-neutral-200 hide-mobile"><div class="flex flex-wrap gap-1">\${reviewers}</div></td>
          <td class="p-3 border-b border-neutral-200"><span class="\${ageClass}">\${ageText}</span></td>
        </tr>
      \`;
    }

    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('.pr-table th[data-column]').forEach(th => {
        th.addEventListener('click', () => sortTable(th.dataset.column));
      });
    });
  </script>
</body>
</html>`;
}

/**
 * Generate overview cards HTML
 * @param {Object} stats - Statistics object
 * @returns {string} HTML for overview cards
 */
function generateOverviewCards(stats) {
  return `
    <section class="cards-grid mb-8">
      <div class="metric-card">
        <div class="card-icon">&#128256;</div>
        <div class="flex-1">
          <p class="card-value text-brand-600">${stats.totalPRs}</p>
          <p class="card-title">Open PRs</p>
        </div>
      </div>
      <div class="metric-card">
        <div class="card-icon">&#128101;</div>
        <div class="flex-1">
          <p class="card-value text-brand-600">${stats.uniqueAuthors}</p>
          <p class="card-title">Authors</p>
        </div>
      </div>
      <div class="metric-card">
        <div class="card-icon">&#128193;</div>
        <div class="flex-1">
          <p class="card-value text-brand-600">${stats.reposWithOpenPRs}</p>
          <p class="card-title">Repos with PRs</p>
        </div>
      </div>
      <div class="metric-card">
        <div class="card-icon">&#8987;</div>
        <div class="flex-1">
          <p class="card-value text-brand-600">${stats.oldestAgeDays}d</p>
          <p class="card-title">Oldest PR</p>
        </div>
      </div>
      <div class="metric-card">
        <div class="card-icon">&#128221;</div>
        <div class="flex-1">
          <p class="card-value text-brand-600">${stats.draftCount}</p>
          <p class="card-title">Drafts</p>
        </div>
      </div>
      <div class="metric-card">
        <div class="card-icon">&#128064;</div>
        <div class="flex-1">
          <p class="card-value text-brand-600">${stats.awaitingReview}</p>
          <p class="card-title">Awaiting Review</p>
        </div>
      </div>
    </section>`;
}

/**
 * Generate the PR table HTML
 * @param {Array} prs - Array of PRs
 * @returns {string} HTML for PR table
 */
function generatePRTable(prs) {
  if (prs.length === 0) {
    return `
      <section class="bg-white rounded-lg p-6 shadow-sm">
        <h2 class="section-header border-brand-600">Pull Requests</h2>
        <div class="text-center py-16 text-subtext-color">
          <div class="text-5xl mb-4">&#127881;</div>
          <div class="text-heading-3">No open pull requests!</div>
        </div>
      </section>`;
  }

  const rows = prs.map(pr => {
    const age = calculatePRAge(pr.createdAt);
    const ageClass = age.days < 3 ? 'age-new' : (age.days < 7 ? 'age-moderate' : 'age-old');
    const draftBadge = pr.isDraft ? '<span class="draft-badge">Draft</span>' : '';

    const labels = pr.labels.map(l =>
      `<span class="label" style="background: #${l.color}20; color: #${l.color}; border: 1px solid #${l.color}40;">${l.name}</span>`
    ).join('');

    const reviewers = pr.requestedReviewers.length > 0
      ? pr.requestedReviewers.map(r => `<span class="reviewer">${r}</span>`).join('')
      : '<span class="no-reviewers">None</span>';

    return `
      <tr class="hover:bg-neutral-50">
        <td class="p-3 border-b border-neutral-200"><span class="repo-badge">${pr.repoShort}</span></td>
        <td class="p-3 border-b border-neutral-200">${pr.author}</td>
        <td class="p-3 border-b border-neutral-200">
          <a href="${pr.url}" target="_blank" class="pr-link">${pr.title}</a>
          <span class="pr-number">#${pr.number}</span>
          ${draftBadge}
        </td>
        <td class="p-3 border-b border-neutral-200 hide-mobile"><div class="flex flex-wrap gap-1">${labels || '<span class="no-reviewers">None</span>'}</div></td>
        <td class="p-3 border-b border-neutral-200 hide-mobile"><div class="flex flex-wrap gap-1">${reviewers}</div></td>
        <td class="p-3 border-b border-neutral-200"><span class="${ageClass}">${age.formatted}</span></td>
      </tr>`;
  }).join('');

  return `
    <section class="bg-white rounded-lg p-6 shadow-sm">
      <h2 class="section-header border-brand-600">Pull Requests</h2>
      <div class="overflow-x-auto">
        <table class="data-table pr-table">
          <thead class="bg-neutral-50">
            <tr>
              <th class="p-3 text-left text-caption-bold cursor-pointer select-none hover:bg-neutral-100" data-column="repo">Repo <span class="sort-icon opacity-50">&#8597;</span></th>
              <th class="p-3 text-left text-caption-bold cursor-pointer select-none hover:bg-neutral-100" data-column="author">Author <span class="sort-icon opacity-50">&#8597;</span></th>
              <th class="p-3 text-left text-caption-bold cursor-pointer select-none hover:bg-neutral-100" data-column="title">Title <span class="sort-icon opacity-50">&#8597;</span></th>
              <th class="p-3 text-left text-caption-bold hide-mobile">Labels</th>
              <th class="p-3 text-left text-caption-bold hide-mobile">Reviewers</th>
              <th class="p-3 text-left text-caption-bold cursor-pointer select-none hover:bg-neutral-100 sorted" data-column="age">Age <span class="sort-icon">&#8595;</span></th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </section>`;
}

/**
 * Get the shared menu CSS for injection into other dashboards
 * @returns {string} CSS styles for shared menu
 */
export function getSharedMenuCSS() {
  return `
    /* Shared Menu - included in Tailwind CSS components */
    .shared-menu {
      background: rgba(0, 0, 0, 0.15);
      padding: 10px 20px;
    }

    .menu-container {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .menu-link {
      color: white;
      text-decoration: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      background: rgba(255, 255, 255, 0.1);
    }

    .menu-link:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .menu-link.active {
      background: rgba(255, 255, 255, 0.3);
      font-weight: 600;
    }`;
}
