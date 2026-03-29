/**
 * Tool definitions and execution for the AI chat assistant.
 *
 * These mirror the MCP server tools but execute locally in the browser,
 * reading/writing from Zustand stores and localStorage.
 */

import { useEquipmentStore } from '../store/useEquipmentStore';
import { useThreatStore } from '../store/useThreatStore';
import { useSettingsStore } from '../store/useSettingsStore';
import type { EquipmentItem } from '../types/equipment';
import { EQUIPMENT_CATEGORIES } from '../types/equipment';

// ── OpenAI-compatible tool definitions ──

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_threat_levels',
      description: 'Get current AI-analyzed threat levels (solar, nuclear, weather, overall) and Diamond Collapse Index. Call this when the user asks about current threats, danger levels, or safety.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_osint_summary',
      description: 'Get latest OSINT intelligence data from all 8 sources including solar weather, nuclear news, severe weather alerts, global news, drought, and economic indicators.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_equipment',
      description: 'Get the full equipment inventory organized by category. Call this when the user asks about their gear, what they have, or before making equipment suggestions.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_equipment',
      description: 'Add a single new item to the equipment inventory.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Item name' },
          qty: { type: 'string', description: 'Quantity (e.g., "2", "1 set")' },
          category: {
            type: 'string',
            description: 'Category',
            enum: [...EQUIPMENT_CATEGORIES],
          },
          status: { type: 'string', enum: ['have', 'wanted', 'ordered'], description: 'Status: "have" = already owned, "wanted" = need to buy, "ordered" = purchased but not arrived. Default: "wanted" for AI suggestions.' },
          notes: { type: 'string', description: 'Optional notes about the item' },
        },
        required: ['name', 'qty', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bulk_add_equipment',
      description: 'Add multiple items to the equipment inventory at once. Use this when building a gear list or suggesting multiple items. Duplicates (same name + category) are automatically skipped.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Array of items to add',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Item name' },
                qty: { type: 'string', description: 'Quantity' },
                category: { type: 'string', description: 'Category', enum: [...EQUIPMENT_CATEGORIES] },
                notes: { type: 'string', description: 'Notes' },
              },
              required: ['name', 'qty', 'category'],
            },
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_equipment',
      description: 'Remove an item from the equipment inventory by name.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Item name to remove (case-insensitive match)' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_equipment_gaps',
      description: 'Analyze the current inventory and identify missing items recommended for a complete 72-hour bugout kit. Returns a gap analysis.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_rally_points',
      description: 'Get the current rally point meeting locations.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_rally_point',
      description: 'Set or update a rally point location.',
      parameters: {
        type: 'object',
        properties: {
          point: { type: 'string', enum: ['1', '2', '3'], description: 'Rally point number (1=Home, 2=Nearby landmark, 3=Route waypoint)' },
          name: { type: 'string', description: 'Location name' },
          description: { type: 'string', description: 'Additional description' },
        },
        required: ['point', 'name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_location',
      description: 'Get the user\'s configured location, nearby military targets, and bugout route info.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

// ── Tool Execution ──

export interface ToolCallResult {
  name: string;
  result: string;
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'get_threat_levels':
      return executeGetThreatLevels();
    case 'get_osint_summary':
      return executeGetOSINT();
    case 'get_equipment':
      return executeGetEquipment();
    case 'add_equipment':
      return executeAddEquipment(args as { name: string; qty: string; category: string; notes?: string });
    case 'bulk_add_equipment':
      return executeBulkAddEquipment(args as { items: Array<{ name: string; qty: string; category: string; notes?: string }> });
    case 'remove_equipment':
      return executeRemoveEquipment(args as { name: string });
    case 'suggest_equipment_gaps':
      return executeSuggestGaps();
    case 'get_rally_points':
      return executeGetRallyPoints();
    case 'set_rally_point':
      return executeSetRallyPoint(args as { point: string; name: string; description?: string });
    case 'get_location':
      return executeGetLocation();
    default:
      return `Unknown tool: ${name}`;
  }
}

function executeGetThreatLevels(): string {
  const data = useThreatStore.getState().data;
  if (!data) return 'No threat data available. Run the monitor first (node monitor/index.js).';

  const a = data.assessment;
  const lines = [
    `Threat Assessment (updated ${new Date(data.timestamp).toLocaleString()})`,
    '',
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
    lines.push(`  Composite:     ${a.diamond.composite.level}/10 (${a.diamond.composite.label})`);
  }

  return lines.join('\n');
}

function executeGetOSINT(): string {
  const data = useThreatStore.getState().data;
  if (!data) return 'No OSINT data available.';

  const s = data.sourceData;
  const lines = ['OSINT Intelligence Summary:', ''];

  if (s.solarData) lines.push(`Solar: Kp=${s.solarData.currentKp}, 24h max=${s.solarData.maxKp24h}, ${s.solarData.stormLevel || 'quiet'}`);
  if (s.donkiData) lines.push(`DONKI: ${s.donkiData.cmeCount} CMEs, ${s.donkiData.flareCount} flares, ${s.donkiData.stormCount} storms${s.donkiData.hasEarthDirectedCME ? ' — EARTH-DIRECTED CME!' : ''}`);
  if (s.swpcAlertsData) lines.push(`SWPC: ${s.swpcAlertsData.alertCount} alerts, G${s.swpcAlertsData.highestGeomagScale} geomag`);
  if (s.weatherData) lines.push(`Weather: ${s.weatherData.count} alerts${s.weatherData.hasTornadoWarning ? ' — TORNADO WARNING!' : ''}`);
  if (s.nuclearData) {
    lines.push(`Nuclear: ${s.nuclearData.headlines?.length || 0} headlines, Doomsday Clock: ${s.nuclearData.doomsdayClock?.value || 'unknown'}`);
    s.nuclearData.headlines?.slice(0, 3).forEach((h: { source: string; title: string }) => lines.push(`  - [${h.source}] ${h.title}`));
  }
  if (s.gdeltData) lines.push(`GDELT: nuclear=${s.gdeltData.nuclear?.articleCount || 0}, military=${s.gdeltData.military?.articleCount || 0}, unrest=${s.gdeltData.unrest?.articleCount || 0}`);
  if (s.droughtData) lines.push(`Drought: ${s.droughtData.highestCategory}, severity ${s.droughtData.severityScore}/100`);
  if (s.economicData) lines.push(`Economic: stress ${s.economicData.stressScore}/100`);

  return lines.join('\n');
}

function executeGetEquipment(): string {
  const items = useEquipmentStore.getState().items;
  if (items.length === 0) return 'No equipment in inventory. Use add_equipment or bulk_add_equipment to add items.';

  const byCategory: Record<string, EquipmentItem[]> = {};
  items.forEach(i => {
    if (!byCategory[i.category]) byCategory[i.category] = [];
    byCategory[i.category].push(i);
  });

  const lines = [`Equipment Inventory (${items.length} items):`, ''];
  for (const [cat, catItems] of Object.entries(byCategory)) {
    lines.push(`## ${cat} (${catItems.length})`);
    catItems.forEach(i => lines.push(`  - ${i.name} (qty: ${i.qty})${i.notes ? ' — ' + i.notes : ''}`));
    lines.push('');
  }
  return lines.join('\n');
}

function executeAddEquipment(args: { name: string; qty: string; category: string; notes?: string; status?: string }): string {
  useEquipmentStore.getState().addItem({
    name: args.name,
    qty: args.qty,
    category: args.category,
    status: (args.status as 'have' | 'wanted' | 'ordered') || 'wanted',
    notes: args.notes || '',
  });
  const statusLabel = args.status === 'have' ? '✅' : args.status === 'ordered' ? '📦' : '🎯';
  return `Added "${args.name}" (qty: ${args.qty}) to ${args.category} as ${statusLabel} ${args.status || 'wanted'}.`;
}

function executeBulkAddEquipment(args: { items: Array<{ name: string; qty: string; category: string; notes?: string }> }): string {
  const store = useEquipmentStore.getState();
  const existing = new Set(store.items.map(i => `${i.name}|${i.category}`.toLowerCase()));

  let added = 0;
  let skipped = 0;

  for (const item of args.items) {
    const key = `${item.name}|${item.category}`.toLowerCase();
    if (existing.has(key)) {
      skipped++;
      continue;
    }
    store.addItem({
      name: item.name,
      qty: item.qty,
      category: item.category,
      status: (item as { status?: string }).status as 'have' | 'wanted' | 'ordered' || 'wanted',
      notes: item.notes || '',
    });
    existing.add(key);
    added++;
  }

  return `Bulk import: ${added} items added, ${skipped} duplicates skipped. Total inventory: ${useEquipmentStore.getState().items.length} items.`;
}

function executeRemoveEquipment(args: { name: string }): string {
  const store = useEquipmentStore.getState();
  const item = store.items.find(i => i.name.toLowerCase() === args.name.toLowerCase());
  if (!item) return `No item found matching "${args.name}".`;
  store.deleteItem(item.id);
  return `Removed "${item.name}" from ${item.category}.`;
}

function executeSuggestGaps(): string {
  const items = useEquipmentStore.getState().items;
  const categories: Record<string, string[]> = {};
  items.forEach(i => {
    if (!categories[i.category]) categories[i.category] = [];
    categories[i.category].push(i.name.toLowerCase());
  });

  const RECOMMENDED: Record<string, string[]> = {
    'Water': ['water filter', 'water container', 'purification tablets'],
    'Food': ['freeze-dried meals', 'energy bars'],
    'Shelter & Warmth': ['tent', 'sleeping bag'],
    'Fire & Cooking': ['fire starter', 'stove', 'cookware'],
    'Communications': ['radio', 'walkie-talkie', 'hand-crank radio'],
    'Medical & Hygiene': ['first aid kit', 'pain relief', 'tourniquet'],
    'Navigation': ['map', 'compass'],
    'Light': ['headlamp', 'flashlight'],
    'Power': ['solar panel', 'power bank'],
    'Tools & Blades': ['knife', 'multi-tool'],
    'Cordage & Repair': ['paracord', 'duct tape'],
    'Knowledge & Reference': ['survival manual'],
    'Carry & Transport': ['backpack'],
    'Detection & Optics': ['binoculars'],
    'EMP / Faraday Protection': ['faraday bag'],
  };

  const lines = ['Equipment Gap Analysis:', ''];
  let totalGaps = 0;

  for (const [cat, recs] of Object.entries(RECOMMENDED)) {
    const catItems = categories[cat] || [];
    const missing = recs.filter(rec =>
      !catItems.some(item => item.includes(rec) || rec.split(' ').some(w => item.includes(w)))
    );
    if (missing.length > 0) {
      totalGaps += missing.length;
      lines.push(`❌ ${cat}: missing ${missing.join(', ')}`);
    } else {
      lines.push(`✅ ${cat}: covered`);
    }
  }

  lines.push('', `Total gaps: ${totalGaps}. ${totalGaps === 0 ? 'Your kit looks complete!' : 'Use add_equipment or bulk_add_equipment to fill gaps.'}`);
  return lines.join('\n');
}

function executeGetRallyPoints(): string {
  const raw = localStorage.getItem('bugout-rally');
  const points = raw ? JSON.parse(raw) : { '1': 'Home', '2': '[Not set]', '3': '[Not set]' };
  const lines = ['Rally Points:', ''];
  for (const [idx, val] of Object.entries(points)) {
    const display = typeof val === 'object' ? (val as { name: string }).name || '[Not set]' : val;
    lines.push(`${idx}. ${display}`);
  }
  return lines.join('\n');
}

function executeSetRallyPoint(args: { point: string; name: string; description?: string }): string {
  const raw = localStorage.getItem('bugout-rally');
  const points = raw ? JSON.parse(raw) : {};
  points[args.point] = args.name;
  localStorage.setItem('bugout-rally', JSON.stringify(points));
  return `Rally point ${args.point} set to "${args.name}".`;
}

function executeGetLocation(): string {
  const settings = useSettingsStore.getState();
  const lines = [
    `Location: ${settings.location.city}, ${settings.location.state}`,
    `Nearby Targets: ${settings.location.nearbyTargets.length > 0 ? settings.location.nearbyTargets.join(', ') : 'None configured'}`,
  ];
  return lines.join('\n');
}
