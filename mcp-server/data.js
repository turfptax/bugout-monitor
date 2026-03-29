/**
 * Shared data reading helpers for the MCP server.
 * Reads from the same data files as the React app and monitor.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/**
 * Read and parse a JSON file, returning null if missing.
 */
async function readJSON(path) {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Get user configuration.
 */
export async function getConfig() {
  return readJSON(resolve(ROOT, 'user-config.json'));
}

/**
 * Get the latest threat assessment data.
 */
export async function getThreatData() {
  return readJSON(resolve(ROOT, 'app/public/threat-data.json'));
}

/**
 * Get equipment inventory from the exported JSON file.
 * The React app stores equipment in localStorage, but for MCP we read/write
 * a JSON file that acts as a bridge.
 */
export async function getEquipment() {
  const data = await readJSON(resolve(ROOT, 'data/equipment.json'));
  return data || [];
}

export async function saveEquipment(items) {
  const dir = resolve(ROOT, 'data');
  try { await import('node:fs').then(fs => fs.mkdirSync(dir, { recursive: true })); } catch {}
  await writeFile(resolve(dir, 'equipment.json'), JSON.stringify(items, null, 2), 'utf-8');
}

/**
 * Get rally points.
 */
export async function getRallyPoints() {
  const data = await readJSON(resolve(ROOT, 'data/rally-points.json'));
  return data || { '1': { name: 'Home', description: '' }, '2': { name: '', description: '' }, '3': { name: '', description: '' } };
}

export async function saveRallyPoints(points) {
  const dir = resolve(ROOT, 'data');
  try { await import('node:fs').then(fs => fs.mkdirSync(dir, { recursive: true })); } catch {}
  await writeFile(resolve(dir, 'rally-points.json'), JSON.stringify(points, null, 2), 'utf-8');
}

/**
 * Get the latest monitor log (most recent threat scan results).
 */
export async function getLatestLog() {
  const { readdir } = await import('node:fs/promises');
  const logsDir = resolve(ROOT, 'monitor/logs');
  try {
    const files = await readdir(logsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'scheduler.log').sort().reverse();
    if (jsonFiles.length === 0) return null;
    return readJSON(resolve(logsDir, jsonFiles[0]));
  } catch {
    return null;
  }
}

/**
 * Get plan section content. Returns a simplified version of the plan.
 */
export async function getPlanSections() {
  const config = await getConfig();
  const location = config?.profile?.baseCityState || 'your location';

  return {
    1: { title: 'Threat Assessment', content: `Threat assessment for ${location}. Configure nearby military targets and natural hazards in your settings.` },
    2: { title: 'Decision Framework', content: 'Bug Out vs Shelter in Place decision matrix based on home safety, utilities, streets, threat type, authority guidance, and radiation detection.' },
    3: { title: 'Scenario Quick-Reference Cards', content: 'Nuclear Event, Carrington/EMP, Civil Unrest, Food/Supply Shortage, Severe Storm/Tornado, Extended Power Outage (Winter).' },
    4: { title: 'Equipment Inventory', content: 'Use get_equipment tool for current inventory.' },
    5: { title: 'Gap Analysis', content: 'Recommended categories: Food (72hr freeze-dried), Medical (IFAK/trauma kit), Navigation (paper maps + compass), Light (headlamps), Power (20K+ mAh bank), Water (purification tablets), Documents (waterproof ID copies), Hygiene, Defense, Clothing, Cash ($200-500 small bills), Cordage/Repair.' },
    6: { title: 'Bugout Bag Loadout', content: 'Two bags (one per person). Heavy items low and close to back. Each bag independently sustains one person for 72 hours.' },
    7: { title: 'Bugout Routes', content: `Routes configured for ${location}. Use get_location tool for route details.` },
    8: { title: 'Communications Plan', content: '5-tier comms: Tier 1 Meshtastic LoRa (encrypted text + GPS), Tier 2 Baofeng UV-5R (voice), Tier 3 FRS walkie-talkies (backup), Tier 4 Cell phone/LTE watch, Tier 5 Hand-crank radio (receive only).' },
    9: { title: 'Rally Points', content: 'Use get_rally_points tool for current rally point locations.' },
    10: { title: 'Shelter-in-Place Plan', content: 'Phases: Immediate (first 2 hours) — fill water, charge devices, stage bags. Days 1-3 — ration food, establish watch schedule. Days 3-7+ — evaluate if situation is improving or worsening.' },
    11: { title: '60-Second Go Checklist', content: '1. Both backpacks, 2. Critical electronics case, 3. Radios on frequency, 4. Meshtastic devices on, 5. Keys/phones/wallets, 6. Fill water buckets, 7. Grab medications, 8. Load vehicle, 9. Confirm route with partner, 10. Lock and go.' },
    12: { title: 'Emergency Contacts', content: '911, local emergency management, state emergency management, NOAA weather radio, out-of-state contact, radio frequencies.' },
  };
}
