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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
      color: #1a1a1a;
      line-height: 1.6;
    }
    .shared-menu { background: #1a1a1a; padding: 20px 0; border-bottom: 1px solid #e0e0e0; }
    .menu-container { max-width: 1280px; margin: 0 auto; display: flex; gap: 0; padding: 0 40px; }
    .menu-link { color: #fff; text-decoration: none; padding: 14px 24px; font-size: 14px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px; transition: background 0.3s ease; }
    .menu-link:hover { background: rgba(255, 255, 255, 0.1); }
    .menu-link.active { background: rgba(255, 255, 255, 0.15); }
    .dashboard-container { max-width: 1280px; margin: 0 auto; background: white; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); border-radius: 0; }
    .dashboard-header { background: #1a1a1a; color: white; padding: 2rem 1rem; text-align: center; }
    .dashboard-header h1 { font-size: 48px; margin-bottom: 0.5rem; font-weight: 300; letter-spacing: -0.5px; }
    .dashboard-content { padding: 1.5rem; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .metric-card { background: white; border: 1px solid #e0e0e0; border-radius: 0; padding: 1rem; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); transition: box-shadow 0.3s ease; }
    .metric-card:hover { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); }
    .card-title { font-size: 12px; color: #707070; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 400; }
    .card-value { font-size: 48px; font-weight: 300; color: #1a1a1a; }
    .trend-positive { color: rgb(13, 148, 136); }
    .trend-negative { color: rgb(220, 38, 38); }
    .trend-neutral { color: #707070; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 0.625rem 0.75rem; text-align: left; border-bottom: 1px solid #e0e0e0; }
    .data-table thead { background: #fafafa; border-bottom: 2px solid #1a1a1a; }
    .data-table th { font-weight: 400; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; }
    .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1rem; }
    .chart-card { background: white; border: 1px solid #e0e0e0; border-radius: 0; padding: 1rem; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); }
    .leaderboards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
    .leaderboard { background: white; border: 1px solid #e0e0e0; border-radius: 0; padding: 1rem; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); }
    .section-header { font-size: 28px; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #1a1a1a; color: #1a1a1a; font-weight: 300; }
    .view-toggle { display: flex; gap: 0.5rem; justify-content: center; margin-top: 1rem; }
    .toggle-btn { padding: 14px 24px; background: rgba(255, 255, 255, 0.2); color: white; border: 2px solid white; border-radius: 0; cursor: pointer; font-size: 14px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px; transition: background 0.3s ease; }
    .toggle-btn:hover { background: rgba(255, 255, 255, 0.3); }
    .toggle-btn.active { background: white; color: #1a1a1a; }
    @media print { body { background: white; } .dashboard-container { box-shadow: none; } }
  `;
}
