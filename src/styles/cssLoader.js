/**
 * CSS Loader utility for embedding compiled Tailwind CSS into HTML templates
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache the CSS in memory
let cachedCSS = null;

/**
 * Get the compiled Tailwind CSS as a string
 * @returns {string} The compiled CSS
 */
export function getCompiledCSS() {
  if (cachedCSS) {
    return cachedCSS;
  }

  const cssPath = join(__dirname, 'output.css');

  if (!existsSync(cssPath)) {
    console.warn('Warning: Compiled CSS not found at', cssPath);
    console.warn('Run "npm run build:css" to generate the CSS file');
    return getFallbackCSS();
  }

  cachedCSS = readFileSync(cssPath, 'utf-8');
  return cachedCSS;
}

/**
 * Clear the cached CSS (useful for development/watch mode)
 */
export function clearCSSCache() {
  cachedCSS = null;
}

/**
 * Fallback minimal CSS if compiled CSS is not available
 * This ensures dashboards still render acceptably without Tailwind build
 */
function getFallbackCSS() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f9fafb;
      color: #111827;
      line-height: 1.5;
    }
    .dashboard-container { max-width: 1280px; margin: 0 auto; background: white; }
    .dashboard-header { background: #262626; color: white; padding: 2.5rem 1.25rem; text-align: center; }
    .dashboard-header h1 { font-size: 1.875rem; margin-bottom: 0.5rem; }
    .dashboard-content { padding: 2rem; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.25rem; margin-bottom: 2.5rem; }
    .metric-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.25rem; }
    .card-value { font-size: 1.875rem; font-weight: bold; color: #262626; }
    .trend-positive { color: #059669; }
    .trend-negative { color: #dc2626; }
    .trend-neutral { color: #6b7280; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .data-table thead { background: #f9fafb; }
    .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.25rem; }
    .chart-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.25rem; }
    .leaderboards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.25rem; }
    .leaderboard { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.25rem; }
    .section-header { font-size: 1.25rem; margin-bottom: 1.25rem; padding-bottom: 0.5rem; border-bottom: 2px solid #262626; }
    @media print { body { background: white; } .dashboard-container { box-shadow: none; } }
  `;
}
