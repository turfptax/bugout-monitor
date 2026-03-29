/**
 * Injects the threat dashboard HTML into the existing index.html.
 * Uses marker comments to find and replace the dashboard section.
 * On first run, inserts between the header and layout divs.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { START_MARKER, END_MARKER } from './dashboard.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = resolve(__dirname, '../../index.html');

/**
 * Inject or replace the threat dashboard in index.html.
 */
export async function injectDashboard(dashboardHTML) {
  let html = await readFile(INDEX_PATH, 'utf-8');

  // Validate the file looks like our bugout plan page
  if (!html.includes('Bugout & Disaster Plan')) {
    throw new Error('index.html does not appear to be the bugout plan page — aborting write');
  }

  const hasMarkers = html.includes(START_MARKER) && html.includes(END_MARKER);

  if (hasMarkers) {
    // Replace existing dashboard
    const startIdx = html.indexOf(START_MARKER);
    const endIdx = html.indexOf(END_MARKER) + END_MARKER.length;
    html = html.slice(0, startIdx) + dashboardHTML + html.slice(endIdx);
  } else {
    // First run — insert between header closing div and layout div
    // The header ends with </div>\n\n<div class="layout">
    const insertionPattern = '</div>\n\n<div class="layout">';
    const insertionIdx = html.indexOf(insertionPattern);

    if (insertionIdx === -1) {
      // Try alternate spacing
      const altPattern = '</div>\r\n\r\n<div class="layout">';
      const altIdx = html.indexOf(altPattern);
      if (altIdx === -1) {
        throw new Error('Could not find insertion point in index.html (header/layout boundary)');
      }
      // Insert after the first </div> and before the <div class="layout">
      const splitPoint = altIdx + '</div>'.length;
      html = html.slice(0, splitPoint) + '\n\n' + dashboardHTML + '\n' + html.slice(splitPoint);
    } else {
      const splitPoint = insertionIdx + '</div>'.length;
      html = html.slice(0, splitPoint) + '\n\n' + dashboardHTML + '\n' + html.slice(splitPoint);
    }
  }

  await writeFile(INDEX_PATH, html, 'utf-8');
  return INDEX_PATH;
}
