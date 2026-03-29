#!/usr/bin/env node
/**
 * Bugout Monitor — MCP Server
 *
 * Exposes bugout plan data as tools and resources for MCP-compatible AI clients
 * (Claude Code, Claude Desktop, etc.).
 *
 * Transport: stdio (standard for Claude integrations)
 *
 * Usage:
 *   node mcp-server/index.js
 *
 * Claude Desktop config (~/.claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "bugout-monitor": {
 *         "command": "node",
 *         "args": ["path/to/bugout-monitor/mcp-server/index.js"]
 *       }
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  getConfig,
  getThreatData,
  getEquipment,
  saveEquipment,
  getRallyPoints,
  saveRallyPoints,
  getLatestLog,
  getPlanSections,
} from './data.js';

const server = new McpServer({
  name: 'bugout-monitor',
  version: '1.0.0',
});

// ── Tools ──

server.tool(
  'get_threat_levels',
  'Get current AI-analyzed threat levels (solar, nuclear, weather, overall) and Diamond Collapse Index',
  {},
  async () => {
    const data = await getThreatData();
    if (!data) {
      return { content: [{ type: 'text', text: 'No threat data available. Run the monitor first: node monitor/index.js' }] };
    }

    const a = data.assessment;
    const lines = [
      `Threat Assessment (updated ${new Date(data.timestamp).toLocaleString()})`,
      ``,
      `Solar / Carrington:  ${a.solar.level}/10 (${a.solar.label}) — ${a.solar.reasoning}`,
      `Nuclear Threat:      ${a.nuclear.level}/10 (${a.nuclear.label}) — ${a.nuclear.reasoning}`,
      `Weather / Tornado:   ${a.weather.level}/10 (${a.weather.label}) — ${a.weather.reasoning}`,
      `Overall:             ${a.overall.level}/10 (${a.overall.label}) — ${a.overall.reasoning}`,
    ];

    if (a.diamond) {
      lines.push('', 'Diamond Collapse Index:');
      lines.push(`  Environmental: ${a.diamond.environmental.level}/10 — ${a.diamond.environmental.reasoning}`);
      lines.push(`  Climate:       ${a.diamond.climate.level}/10 — ${a.diamond.climate.reasoning}`);
      lines.push(`  Hostile:       ${a.diamond.hostile.level}/10 — ${a.diamond.hostile.reasoning}`);
      lines.push(`  Trade/Supply:  ${a.diamond.trade.level}/10 — ${a.diamond.trade.reasoning}`);
      lines.push(`  Response:      ${a.diamond.response.level}/10 — ${a.diamond.response.reasoning}`);
      lines.push(`  Composite:     ${a.diamond.composite.level}/10 (${a.diamond.composite.label}) — ${a.diamond.composite.reasoning}`);
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

server.tool(
  'get_osint_summary',
  'Get latest OSINT intelligence data from all 8 sources (solar, weather, nuclear, GDELT, drought, economic)',
  {},
  async () => {
    const data = await getThreatData();
    if (!data) {
      return { content: [{ type: 'text', text: 'No OSINT data available. Run the monitor first.' }] };
    }

    const s = data.sourceData;
    const lines = ['OSINT Intelligence Summary:', ''];

    if (s.solarData && s.solarData.status !== 'UNAVAILABLE') {
      lines.push(`☀️ Solar: Kp=${s.solarData.currentKp}, 24h max=${s.solarData.maxKp24h}, ${s.solarData.stormLevel}`);
    }
    if (s.donkiData && s.donkiData.status !== 'UNAVAILABLE') {
      lines.push(`🔭 DONKI: ${s.donkiData.cmeCount} CMEs, ${s.donkiData.flareCount} flares, ${s.donkiData.stormCount} storms${s.donkiData.hasEarthDirectedCME ? ' ⚠️ EARTH-DIRECTED CME' : ''}`);
    }
    if (s.swpcAlertsData && s.swpcAlertsData.status !== 'UNAVAILABLE') {
      lines.push(`📡 SWPC: ${s.swpcAlertsData.alertCount} alerts, G${s.swpcAlertsData.highestGeomagScale} geomag, R${s.swpcAlertsData.highestRadioBlackout} radio blackout`);
    }
    if (s.weatherData && s.weatherData.status !== 'UNAVAILABLE') {
      lines.push(`🌪️ Weather: ${s.weatherData.count} alerts${s.weatherData.hasTornadoWarning ? ' ⚠️ TORNADO WARNING' : ''}`);
    }
    if (s.nuclearData && s.nuclearData.status !== 'UNAVAILABLE') {
      lines.push(`☢️ Nuclear: ${s.nuclearData.headlines?.length || 0} headlines, Doomsday Clock: ${s.nuclearData.doomsdayClock?.value}`);
      if (s.nuclearData.headlines?.length) {
        s.nuclearData.headlines.slice(0, 5).forEach(h => lines.push(`   - [${h.source}] ${h.title}`));
      }
    }
    if (s.gdeltData && s.gdeltData.status !== 'UNAVAILABLE') {
      lines.push(`🌐 GDELT: ${s.gdeltData.totalArticleCount || 0} articles (nuclear: ${s.gdeltData.nuclear?.articleCount || 0}, military: ${s.gdeltData.military?.articleCount || 0}, unrest: ${s.gdeltData.unrest?.articleCount || 0})`);
    }
    if (s.droughtData && s.droughtData.status !== 'UNAVAILABLE') {
      lines.push(`🏜️ Drought: ${s.droughtData.highestCategory}, severity ${s.droughtData.severityScore}/100`);
    }
    if (s.economicData && s.economicData.status !== 'UNAVAILABLE') {
      lines.push(`📊 Economic: stress ${s.economicData.stressScore}/100`);
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

server.tool(
  'get_equipment',
  'Get the full equipment inventory organized by category',
  {},
  async () => {
    const items = await getEquipment();
    if (!items.length) {
      return { content: [{ type: 'text', text: 'No equipment items found. Add items via the web app or use add_equipment tool.' }] };
    }

    const byCategory = {};
    items.forEach(item => {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    });

    const lines = ['Equipment Inventory:', ''];
    for (const [cat, catItems] of Object.entries(byCategory)) {
      lines.push(`## ${cat}`);
      catItems.forEach(item => {
        lines.push(`  - ${item.name} (qty: ${item.qty})${item.notes ? ' — ' + item.notes : ''}`);
      });
      lines.push('');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

server.tool(
  'add_equipment',
  'Add a new item to the equipment inventory',
  {
    name: z.string().describe('Item name'),
    qty: z.string().describe('Quantity (e.g., "2", "1 set")'),
    category: z.string().describe('Category: Carry & Transport, Communications, Shelter & Warmth, Fire & Cooking, Water, Tools & Blades, Power, Detection & Optics, EMP / Faraday Protection, Light, Food, Navigation, Cordage & Repair, Medical & Hygiene, Knowledge & Reference'),
    notes: z.string().optional().describe('Notes about the item'),
  },
  async ({ name, qty, category, notes }) => {
    const items = await getEquipment();
    const newItem = {
      id: 'mcp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name,
      qty,
      category,
      notes: notes || '',
      added: new Date().toISOString(),
    };
    items.push(newItem);
    await saveEquipment(items);
    return { content: [{ type: 'text', text: `Added "${name}" (qty: ${qty}) to ${category}.` }] };
  }
);

server.tool(
  'remove_equipment',
  'Remove an item from the equipment inventory by ID or name',
  {
    identifier: z.string().describe('Item ID or item name to remove'),
  },
  async ({ identifier }) => {
    let items = await getEquipment();
    const before = items.length;
    items = items.filter(i => i.id !== identifier && i.name.toLowerCase() !== identifier.toLowerCase());
    if (items.length === before) {
      return { content: [{ type: 'text', text: `No item found matching "${identifier}".` }] };
    }
    await saveEquipment(items);
    return { content: [{ type: 'text', text: `Removed item matching "${identifier}". ${before - items.length} item(s) removed.` }] };
  }
);

server.tool(
  'bulk_add_equipment',
  'Add multiple items to the equipment inventory at once. Use this when the user asks you to build an equipment list, suggest gear, or populate their inventory. Items with duplicate names (case-insensitive) in the same category will be skipped.',
  {
    items: z.array(z.object({
      name: z.string().describe('Item name'),
      qty: z.string().describe('Quantity'),
      category: z.string().describe('Category (must be one of the 15 valid categories)'),
      notes: z.string().optional().describe('Notes'),
    })).describe('Array of items to add'),
  },
  async ({ items: newItems }) => {
    const existing = await getEquipment();
    const existingSet = new Set(existing.map(i => `${i.name}|${i.category}`.toLowerCase()));

    let added = 0;
    let skipped = 0;

    for (const item of newItems) {
      const key = `${item.name}|${item.category}`.toLowerCase();
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }
      existing.push({
        id: 'mcp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: item.name,
        qty: item.qty,
        category: item.category,
        notes: item.notes || '',
        added: new Date().toISOString(),
      });
      existingSet.add(key);
      added++;
    }

    await saveEquipment(existing);
    return {
      content: [{
        type: 'text',
        text: `Bulk import complete: ${added} items added, ${skipped} duplicates skipped. Total inventory: ${existing.length} items.`
      }]
    };
  }
);

server.tool(
  'suggest_equipment',
  'Analyze the current equipment inventory and suggest missing items for a complete 72-hour bugout kit. Returns a gap analysis with recommendations.',
  {},
  async () => {
    const items = await getEquipment();
    const categories = {};
    items.forEach(i => {
      if (!categories[i.category]) categories[i.category] = [];
      categories[i.category].push(i.name.toLowerCase());
    });

    const RECOMMENDED = {
      'Water': ['water filter', 'water container', 'purification tablets'],
      'Food': ['freeze-dried meals', 'energy bars', 'trail mix'],
      'Shelter & Warmth': ['tent', 'sleeping bag', 'blanket'],
      'Fire & Cooking': ['fire starter', 'stove', 'cookware'],
      'Communications': ['radio', 'walkie-talkie', 'hand-crank radio'],
      'Medical & Hygiene': ['first aid kit', 'pain relief', 'antibiotic', 'tourniquet'],
      'Navigation': ['map', 'compass'],
      'Light': ['headlamp', 'flashlight'],
      'Power': ['solar panel', 'power bank', 'batteries'],
      'Tools & Blades': ['knife', 'multi-tool'],
      'Cordage & Repair': ['paracord', 'duct tape'],
      'Knowledge & Reference': ['survival manual'],
      'Carry & Transport': ['backpack'],
      'Detection & Optics': ['binoculars'],
    };

    const lines = ['Equipment Gap Analysis:', ''];
    let totalGaps = 0;

    for (const [cat, recs] of Object.entries(RECOMMENDED)) {
      const catItems = categories[cat] || [];
      const missing = recs.filter(rec =>
        !catItems.some(item => item.includes(rec) || rec.includes(item.split(' ')[0]))
      );
      if (missing.length > 0) {
        totalGaps += missing.length;
        lines.push(`❌ ${cat}: missing ${missing.join(', ')}`);
      } else {
        lines.push(`✅ ${cat}: covered`);
      }
    }

    lines.push('', `Total gaps: ${totalGaps}. ${totalGaps === 0 ? 'Your kit looks complete!' : 'Use add_equipment or bulk_add_equipment to fill these gaps.'}`);

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

server.tool(
  'get_rally_points',
  'Get the current rally point meeting locations',
  {},
  async () => {
    const points = await getRallyPoints();
    const lines = ['Rally Points:', ''];
    for (const [idx, point] of Object.entries(points)) {
      const name = point.name || '[Not set]';
      const desc = point.description || '';
      lines.push(`${idx}. ${name}${desc ? ' — ' + desc : ''}`);
    }
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

server.tool(
  'set_rally_point',
  'Set or update a rally point location',
  {
    point: z.enum(['1', '2', '3']).describe('Rally point number (1=Home, 2=Nearby landmark, 3=Route waypoint)'),
    name: z.string().describe('Location name'),
    description: z.string().optional().describe('Additional description'),
  },
  async ({ point, name, description }) => {
    const points = await getRallyPoints();
    points[point] = { name, description: description || '' };
    await saveRallyPoints(points);
    return { content: [{ type: 'text', text: `Rally point ${point} set to "${name}".` }] };
  }
);

server.tool(
  'get_plan_section',
  'Get content of a specific disaster plan section (1-12)',
  {
    section: z.number().min(1).max(12).describe('Section number (1=Threat Assessment, 2=Decision Framework, 3=Scenarios, 4=Equipment, 5=Gap Analysis, 6=Bag Loadout, 7=Routes, 8=Comms, 9=Rally Points, 10=Shelter-in-Place, 11=Go Checklist, 12=Contacts)'),
  },
  async ({ section }) => {
    const sections = await getPlanSections();
    const s = sections[section];
    if (!s) {
      return { content: [{ type: 'text', text: `Section ${section} not found.` }] };
    }
    return { content: [{ type: 'text', text: `## Section ${section}: ${s.title}\n\n${s.content}` }] };
  }
);

server.tool(
  'get_location',
  'Get the user\'s configured location, nearby targets, and bugout routes',
  {},
  async () => {
    const config = await getConfig();
    if (!config) {
      return { content: [{ type: 'text', text: 'No configuration found. Run "node setup.js" first.' }] };
    }

    const lines = [
      `Location: ${config.profile.baseCityState}`,
      `Team: ${config.profile.teamName} (${config.profile.teamSize})`,
      `Coordinates: ${config.location.lat}, ${config.location.lon}`,
      `County: ${config.location.county}, ${config.location.state}`,
      `Prevailing Winds: ${config.location.prevailingWinds}`,
      '',
      'Nearby Targets:',
      ...(config.location.nearbyTargets || []).map(t => `  - ${t}`),
      '',
      'Bugout Routes:',
    ];

    for (const [key, route] of Object.entries(config.routes || {})) {
      lines.push(`  ${key.toUpperCase()}: ${route.name} — ${route.direction || ''} ${route.path || ''} (${route.distance || 'unknown'})`);
      if (route.waypoints?.length) {
        route.waypoints.forEach(w => lines.push(`    → ${w}`));
      }
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

server.tool(
  'run_threat_scan',
  'Trigger a fresh threat monitor scan and return the results. This calls the OSINT monitor to fetch latest data from all 8 sources and run AI analysis.',
  {},
  async () => {
    const { execSync } = await import('node:child_process');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const monitorDir = resolve(__dirname, '../monitor');

    try {
      execSync('node index.js', { cwd: monitorDir, timeout: 120000 });
      const data = await getThreatData();
      if (data) {
        const a = data.assessment;
        return {
          content: [{
            type: 'text',
            text: `Threat scan complete (${new Date(data.timestamp).toLocaleString()}).\n\nSolar: ${a.solar.level}/10, Nuclear: ${a.nuclear.level}/10, Weather: ${a.weather.level}/10, Overall: ${a.overall.level}/10${a.diamond ? `\nDiamond Composite: ${a.diamond.composite.level}/10` : ''}`
          }]
        };
      }
      return { content: [{ type: 'text', text: 'Scan completed but no data file was generated.' }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Scan failed: ${e.message}` }] };
    }
  }
);

// ── Resources ──

server.resource(
  'bugout://threats',
  'bugout://threats',
  async (uri) => {
    const data = await getThreatData();
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      }]
    };
  }
);

server.resource(
  'bugout://equipment',
  'bugout://equipment',
  async (uri) => {
    const items = await getEquipment();
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(items, null, 2),
      }]
    };
  }
);

server.resource(
  'bugout://plan',
  'bugout://plan',
  async (uri) => {
    const sections = await getPlanSections();
    const lines = Object.entries(sections).map(([num, s]) => `## ${num}. ${s.title}\n\n${s.content}`);
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'text/markdown',
        text: lines.join('\n\n---\n\n'),
      }]
    };
  }
);

// ── Start Server ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error('MCP server error:', err);
  process.exit(1);
});
