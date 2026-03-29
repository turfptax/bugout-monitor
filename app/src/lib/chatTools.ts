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
  {
    type: 'function',
    function: {
      name: 'get_plan_status',
      description: 'Get an overview of the entire disaster plan: what sections are complete, what needs attention, equipment readiness, rally point status, and overall preparedness score. Call this when the user asks "what should I do next?", "how prepared am I?", or "what\'s my plan status?".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_scenario_plan',
      description: 'Get the recommended action plan for a specific disaster scenario. Returns step-by-step instructions customized to the user\'s location, gear, and threat levels.',
      parameters: {
        type: 'object',
        properties: {
          scenario: {
            type: 'string',
            enum: ['nuclear', 'emp', 'tornado', 'civil_unrest', 'food_shortage', 'power_outage', 'general'],
            description: 'The disaster scenario to plan for',
          },
        },
        required: ['scenario'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_comms_plan',
      description: 'Set or update communications plan details: primary/backup radio frequencies, code words, check-in schedules, out-of-state contact.',
      parameters: {
        type: 'object',
        properties: {
          primaryFrequency: { type: 'string', description: 'Primary UV-5R simplex frequency (e.g., "146.580 MHz")' },
          backupFrequency: { type: 'string', description: 'Backup frequency' },
          frsChannel: { type: 'string', description: 'FRS channel for F22 walkie-talkies (e.g., "7")' },
          meshtasticChannel: { type: 'string', description: 'Meshtastic channel name and PSK' },
          outOfStateContact: { type: 'string', description: 'Out-of-state emergency contact name and number' },
          codeWords: { type: 'object', description: 'Code words object, e.g. {"green":"all clear","red":"danger"}' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_comms_plan',
      description: 'Get the current communications plan: frequencies, code words, check-in protocol, contacts.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_bugout_route',
      description: 'Set or update a bugout route (Alpha, Bravo, or Charlie).',
      parameters: {
        type: 'object',
        properties: {
          route: { type: 'string', enum: ['alpha', 'bravo', 'charlie'], description: 'Route identifier' },
          name: { type: 'string', description: 'Route name (e.g., "Northwest to Sandhills")' },
          path: { type: 'string', description: 'Route path description (roads, highways)' },
          distance: { type: 'string', description: 'Distance (e.g., "200 miles")' },
          destination: { type: 'string', description: 'Destination description' },
          waypoints: { type: 'string', description: 'Comma-separated waypoints' },
          notes: { type: 'string', description: 'Additional notes' },
        },
        required: ['route', 'name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_bugout_routes',
      description: 'Get all configured bugout routes.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_shelter_plan',
      description: 'Update shelter-in-place plan details: food reserves, water capacity, tripwire conditions for bugging out.',
      parameters: {
        type: 'object',
        properties: {
          foodDays: { type: 'number', description: 'Estimated days of food reserves' },
          waterGallons: { type: 'number', description: 'Water storage capacity in gallons' },
          tripwires: { type: 'array', items: { type: 'string' }, description: 'Conditions that automatically trigger bugout (e.g., "gunfire within 1 mile")' },
          notes: { type: 'string', description: 'Additional shelter-in-place notes' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_shelter_plan',
      description: 'Get current shelter-in-place plan: food reserves, water capacity, tripwire conditions.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_next_actions',
      description: 'Analyze the user\'s entire plan and return the top 5-10 most important actions they should take next, prioritized by urgency and impact. Considers current threat levels, equipment gaps, incomplete plan sections, and seasonal factors.',
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
    case 'get_plan_status':
      return executeGetPlanStatus();
    case 'get_scenario_plan':
      return executeGetScenarioPlan(args as { scenario: string });
    case 'update_comms_plan':
      return executeUpdateCommsPlan(args as Record<string, unknown>);
    case 'get_comms_plan':
      return executeGetCommsPlan();
    case 'update_bugout_route':
      return executeUpdateBugoutRoute(args as { route: string; name: string; path?: string; distance?: string; destination?: string; waypoints?: string; notes?: string });
    case 'get_bugout_routes':
      return executeGetBugoutRoutes();
    case 'set_shelter_plan':
      return executeSetShelterPlan(args as Record<string, unknown>);
    case 'get_shelter_plan':
      return executeGetShelterPlan();
    case 'get_next_actions':
      return executeGetNextActions();
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

// ── Plan Status & Next Actions ──

function executeGetPlanStatus(): string {
  const settings = useSettingsStore.getState();
  const equipment = useEquipmentStore.getState();
  const threat = useThreatStore.getState();
  const rallyRaw = localStorage.getItem('bugout-rally');
  const rally = rallyRaw ? JSON.parse(rallyRaw) : {};
  const commsRaw = localStorage.getItem('bugout-comms');
  const comms = commsRaw ? JSON.parse(commsRaw) : {};
  const routesRaw = localStorage.getItem('bugout-routes');
  const routes = routesRaw ? JSON.parse(routesRaw) : {};
  const shelterRaw = localStorage.getItem('bugout-shelter');
  const shelter = shelterRaw ? JSON.parse(shelterRaw) : {};

  const haveItems = equipment.items.filter(i => i.status === 'have' || !i.status).length;
  const wantedItems = equipment.items.filter(i => i.status === 'wanted').length;
  const orderedItems = equipment.items.filter(i => i.status === 'ordered').length;

  const lines = ['📋 BUGOUT PLAN STATUS', ''];

  // Location
  lines.push(`📍 Location: ${settings.location.city && settings.location.state ? `${settings.location.city}, ${settings.location.state} ✅` : '❌ NOT SET'}`);
  lines.push(`🎯 Nearby Targets: ${settings.location.nearbyTargets.length > 0 ? settings.location.nearbyTargets.join(', ') + ' ✅' : '❌ NOT SET'}`);

  // Threat Monitor
  lines.push(`\n📊 Threat Monitor: ${threat.data ? '✅ Active (last: ' + new Date(threat.data.timestamp).toLocaleDateString() + ')' : '❌ NOT CONFIGURED'}`);

  // Equipment
  lines.push(`\n🎒 Equipment: ${equipment.items.length} total items`);
  lines.push(`  ✅ Have: ${haveItems} | 🎯 Wanted: ${wantedItems} | 📦 Ordered: ${orderedItems}`);

  // Categories coverage
  const coveredCategories = new Set(equipment.items.map(i => i.category));
  const missingCategories = EQUIPMENT_CATEGORIES.filter(c => !coveredCategories.has(c));
  lines.push(`  Categories covered: ${coveredCategories.size}/${EQUIPMENT_CATEGORIES.length}`);
  if (missingCategories.length > 0) lines.push(`  ❌ Empty categories: ${missingCategories.join(', ')}`);

  // Rally Points
  const rallySet = Object.values(rally).filter(v => v && v !== '[Not set]').length;
  lines.push(`\n📍 Rally Points: ${rallySet}/3 set ${rallySet >= 3 ? '✅' : '⚠️'}`);

  // Comms Plan
  const commsFields = ['primaryFrequency', 'backupFrequency', 'frsChannel', 'outOfStateContact'];
  const commsSet = commsFields.filter(f => comms[f]).length;
  lines.push(`📻 Communications: ${commsSet}/${commsFields.length} fields set ${commsSet >= 3 ? '✅' : '⚠️'}`);

  // Routes
  const routeCount = Object.keys(routes).length;
  lines.push(`🗺️ Bugout Routes: ${routeCount}/3 configured ${routeCount >= 2 ? '✅' : '⚠️'}`);

  // Shelter Plan
  lines.push(`🏠 Shelter Plan: ${shelter.foodDays ? `${shelter.foodDays} days food` : '❌ Food not logged'}, ${shelter.waterGallons ? `${shelter.waterGallons} gal water` : '❌ Water not logged'}`);
  lines.push(`  Tripwires: ${shelter.tripwires?.length > 0 ? shelter.tripwires.length + ' set ✅' : '❌ NOT SET'}`);

  // Overall readiness score
  let score = 0;
  if (settings.location.city) score += 10;
  if (settings.location.nearbyTargets.length > 0) score += 5;
  if (threat.data) score += 10;
  if (haveItems >= 10) score += 15;
  if (haveItems >= 25) score += 10;
  if (wantedItems === 0 && haveItems > 0) score += 5;
  if (rallySet >= 3) score += 10;
  if (commsSet >= 3) score += 10;
  if (routeCount >= 2) score += 10;
  if (shelter.foodDays) score += 5;
  if (shelter.tripwires?.length > 0) score += 5;
  if (missingCategories.length === 0) score += 5;

  lines.push(`\n🏆 PREPAREDNESS SCORE: ${score}/100`);
  if (score < 30) lines.push('  Status: Just getting started — lots to do!');
  else if (score < 60) lines.push('  Status: Making progress — key gaps remain');
  else if (score < 80) lines.push('  Status: Well prepared — fine-tuning needed');
  else lines.push('  Status: Excellent readiness!');

  return lines.join('\n');
}

function executeGetScenarioPlan(args: { scenario: string }): string {
  const settings = useSettingsStore.getState();
  const threat = useThreatStore.getState();
  const equipment = useEquipmentStore.getState();
  const location = `${settings.location.city}, ${settings.location.state}`;
  const targets = settings.location.nearbyTargets;
  const itemNames = equipment.items.map(i => i.name.toLowerCase());

  const hasRadio = itemNames.some(n => n.includes('radio') || n.includes('uv-5r') || n.includes('baofeng'));
  const hasMeshtastic = itemNames.some(n => n.includes('meshtastic') || n.includes('lora'));
  const hasGeiger = itemNames.some(n => n.includes('geiger') || n.includes('radiation'));
  const hasWater = itemNames.some(n => n.includes('lifestraw') || n.includes('water filter'));
  const hasFood = itemNames.some(n => n.includes('food') || n.includes('meal') || n.includes('bar'));
  const hasSolar = itemNames.some(n => n.includes('solar'));
  const hasFaraday = itemNames.some(n => n.includes('faraday'));

  const scenarios: Record<string, string> = {
    nuclear: [
      `🔴 NUCLEAR SCENARIO — ${location}`,
      targets.length > 0 ? `⚠️ Nearby targets: ${targets.join(', ')}` : '⚠️ No nearby targets configured — configure these in Settings!',
      '',
      '📋 IMMEDIATE (0-30 min):',
      '1. Get to basement / most interior room immediately',
      '2. Close all windows, seal with plastic + tape if available',
      hasGeiger ? '3. ✅ Turn on Geiger counter — monitor readings' : '3. ❌ NO GEIGER COUNTER — you need one!',
      hasRadio ? '4. ✅ Tune radio to NOAA 162.550 MHz' : '4. ❌ NO RADIO — tune any AM radio to emergency broadcasts',
      '',
      '📋 SHELTER PHASE (0-48 hrs):',
      '5. Do NOT go outside for first 24-48 hours (highest fallout)',
      '6. Fill all containers with water immediately (pipes may fail)',
      hasGeiger ? '7. ✅ Monitor Geiger readings — if RISING, prepare to evacuate' : '7. ❌ Cannot monitor radiation without Geiger counter',
      '',
      '📋 EVACUATION (after 48 hrs if safe):',
      '8. Move UPWIND and PERPENDICULAR from fallout plume',
      '9. Travel northwest — away from prevailing wind direction',
      hasFaraday ? '10. ✅ Retrieve Faraday-protected electronics if EMP occurred' : '10. ❌ No Faraday protection — electronics may be damaged',
      hasMeshtastic ? '11. ✅ Use Meshtastic for silent encrypted comms during movement' : '11. Use voice radio sparingly — others can listen',
      '',
      '⚡ YOUR GEAR STATUS:',
      `  Geiger counter: ${hasGeiger ? '✅' : '❌ CRITICAL GAP'}`,
      `  Radio: ${hasRadio ? '✅' : '❌'}`,
      `  Water filter: ${hasWater ? '✅' : '❌'}`,
      `  Faraday protection: ${hasFaraday ? '✅' : '❌'}`,
    ].join('\n'),

    emp: [
      `⚡ EMP / CARRINGTON EVENT — ${location}`,
      '',
      '📋 IMMEDIATE:',
      '1. Widespread power failure, electronics dead, vehicles may not start',
      '2. Fill ALL containers with water NOW — pumps will fail',
      hasFaraday ? '3. ✅ Retrieve Faraday-protected devices (radio, Meshtastic, Geiger)' : '3. ❌ NO FARADAY BAGS — your electronics may be destroyed',
      '4. Check if vehicle starts — newer vehicles more vulnerable',
      hasRadio ? '5. ✅ Try hand-crank radio for emergency broadcasts' : '5. ❌ No radio to monitor broadcasts',
      '',
      '📋 DAYS 1-3 (Assessment):',
      '6. Shelter in place — assess the scope of the outage',
      hasSolar ? '7. ✅ Deploy solar panels to charge surviving devices' : '7. ❌ No solar charging capability',
      '8. If grid stays down past 72 hrs → prepare to bug out',
      '',
      '📋 IF BUGGING OUT:',
      '9. Travel may require foot/bicycle if vehicles are disabled',
      hasMeshtastic ? '10. ✅ Meshtastic for encrypted position sharing' : '10. Voice radio only — use sparingly',
      `  Solar: ${hasSolar ? '✅' : '❌'}`,
      `  Faraday: ${hasFaraday ? '✅' : '❌ CRITICAL GAP'}`,
    ].join('\n'),

    tornado: [
      `🌪️ TORNADO / SEVERE STORM — ${location}`,
      '',
      '📋 DURING STORM:',
      '1. Basement or interior room, lowest floor, away from windows',
      '2. Cover yourself with mattress, blankets, or heavy furniture',
      hasRadio ? '3. ✅ Monitor NOAA weather radio 162.550 MHz' : '3. Monitor phone alerts or AM radio',
      '',
      '📋 AFTER STORM:',
      '4. Check for injuries — administer first aid',
      '5. Check structural damage to home',
      '6. If home is destroyed → deploy survival tents, contact emergency services',
      '7. Watch for downed power lines, gas leaks',
      '',
      '📋 BUG OUT ONLY IF:',
      '8. Home is structurally destroyed',
      '9. Infrastructure is catastrophically damaged (roads, utilities)',
    ].join('\n'),

    civil_unrest: [
      `⚔️ CIVIL UNREST / SOCIETAL BREAKDOWN — ${location}`,
      '',
      '📋 EARLY STAGE:',
      '1. Keep a LOW PROFILE — avoid downtown/high-density areas',
      '2. Do NOT draw attention to your preparations',
      hasMeshtastic ? '3. ✅ Use Meshtastic for silent encrypted comms — DO NOT use voice radio' : '3. Minimize radio use — others can listen',
      '4. Establish watch schedule with spouse',
      '',
      '📋 IF VIOLENCE APPROACHES:',
      '5. Do NOT wait — leave EARLY (6 hours before everyone else)',
      '6. Travel at NIGHT if possible',
      '7. Avoid main highways — use secondary roads',
      '8. Route Bravo recommended (avoids population centers)',
      '',
      '📋 TRIPWIRES (leave when ANY of these occur):',
      '• Gunfire heard within your neighborhood',
      '• Sustained rioting within 2 miles',
      '• Law enforcement appears overwhelmed/absent',
      '• Supply trucks stop coming to local stores',
    ].join('\n'),

    food_shortage: [
      `🍚 FOOD / SUPPLY SHORTAGE — ${location}`,
      '',
      '📋 IMMEDIATE:',
      '1. Begin rationing stored food immediately',
      hasFood ? '2. ✅ You have food reserves — start with perishables first, then shelf-stable' : '2. ❌ No stored food logged! Grocery stores empty in 3 days',
      '3. Fill all water containers while water pressure lasts',
      '',
      '📋 WEEKS 1-2 (Shelter in place):',
      '4. Use rocket stove for cooking to conserve fuel',
      '5. Maintain low profile — do NOT advertise your supplies',
      hasWater ? '6. ✅ LifeStraws available for water filtration' : '6. ❌ No water filtration — boil all water',
      '',
      '📋 IF SHORTAGE > 2 WEEKS:',
      '7. Bug out toward agricultural/rural areas',
      '8. Barter skills and supplies with rural communities',
      '9. Sandhills region (Route Alpha) has cattle ranching + Ogallala Aquifer water',
    ].join('\n'),

    power_outage: [
      `🔋 EXTENDED POWER OUTAGE (WINTER) — ${location}`,
      '',
      '📋 IMMEDIATE:',
      '1. Insulate ONE room — close off the rest of the house',
      '2. Use sleeping bags, thermal blankets, layer clothing',
      hasSolar ? '3. ✅ Deploy solar panels on south-facing windows for charging' : '3. ❌ No solar charging — conserve all battery power',
      '',
      '📋 HEAT:',
      '4. Rocket stove outdoors for cooking (NEVER use indoors without ventilation!)',
      '5. Tealight candles provide supplemental warmth in small spaces',
      '6. Melt snow for water if pipes freeze',
      '',
      '📋 IF OUTAGE > 5-7 DAYS IN DEEP WINTER:',
      '7. Bug out SOUTH toward Kansas (warmer temperatures)',
      '8. Check road conditions before leaving — ice may block routes',
    ].join('\n'),

    general: [
      `📋 GENERAL PREPAREDNESS — ${location}`,
      '',
      `Equipment: ${equipment.items.length} items logged`,
      `  ✅ Have: ${equipment.items.filter(i => i.status === 'have' || !i.status).length}`,
      `  🎯 Wanted: ${equipment.items.filter(i => i.status === 'wanted').length}`,
      '',
      'Ask me about a specific scenario for detailed guidance:',
      '• "What\'s my nuclear plan?"',
      '• "What if there\'s an EMP?"',
      '• "What should I do in civil unrest?"',
      '• "Help me plan for a food shortage"',
    ].join('\n'),
  };

  return scenarios[args.scenario] || scenarios.general;
}

function executeUpdateCommsPlan(args: Record<string, unknown>): string {
  const raw = localStorage.getItem('bugout-comms');
  const comms = raw ? JSON.parse(raw) : {};
  let updated = 0;

  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined && value !== '') {
      comms[key] = value;
      updated++;
    }
  }

  localStorage.setItem('bugout-comms', JSON.stringify(comms));
  return `Communications plan updated (${updated} field(s)). Current plan:\n${JSON.stringify(comms, null, 2)}`;
}

function executeGetCommsPlan(): string {
  const raw = localStorage.getItem('bugout-comms');
  const comms = raw ? JSON.parse(raw) : {};

  if (Object.keys(comms).length === 0) {
    return 'No communications plan configured yet. Use update_comms_plan to set frequencies, code words, and contacts.';
  }

  const lines = ['📻 Communications Plan:', ''];
  if (comms.primaryFrequency) lines.push(`Primary Frequency: ${comms.primaryFrequency}`);
  if (comms.backupFrequency) lines.push(`Backup Frequency: ${comms.backupFrequency}`);
  if (comms.frsChannel) lines.push(`FRS Channel: ${comms.frsChannel}`);
  if (comms.meshtasticChannel) lines.push(`Meshtastic: ${comms.meshtasticChannel}`);
  if (comms.outOfStateContact) lines.push(`Out-of-State Contact: ${comms.outOfStateContact}`);
  if (comms.codeWords) {
    lines.push('Code Words:');
    for (const [word, meaning] of Object.entries(comms.codeWords)) {
      lines.push(`  "${word}" = ${meaning}`);
    }
  }
  return lines.join('\n');
}

function executeUpdateBugoutRoute(args: { route: string; name: string; path?: string; distance?: string; destination?: string; waypoints?: string; notes?: string }): string {
  const raw = localStorage.getItem('bugout-routes');
  const routes = raw ? JSON.parse(raw) : {};
  routes[args.route] = {
    name: args.name,
    path: args.path || '',
    distance: args.distance || '',
    destination: args.destination || '',
    waypoints: args.waypoints || '',
    notes: args.notes || '',
  };
  localStorage.setItem('bugout-routes', JSON.stringify(routes));
  return `Route ${args.route.toUpperCase()} updated: "${args.name}"${args.distance ? ` (${args.distance})` : ''}`;
}

function executeGetBugoutRoutes(): string {
  const raw = localStorage.getItem('bugout-routes');
  const routes = raw ? JSON.parse(raw) : {};

  if (Object.keys(routes).length === 0) {
    return 'No bugout routes configured. Use update_bugout_route to add routes (alpha, bravo, charlie).';
  }

  const lines = ['🗺️ Bugout Routes:', ''];
  for (const [id, route] of Object.entries(routes)) {
    const r = route as Record<string, string>;
    lines.push(`Route ${id.toUpperCase()}: ${r.name}`);
    if (r.path) lines.push(`  Path: ${r.path}`);
    if (r.distance) lines.push(`  Distance: ${r.distance}`);
    if (r.destination) lines.push(`  Destination: ${r.destination}`);
    if (r.waypoints) lines.push(`  Waypoints: ${r.waypoints}`);
    if (r.notes) lines.push(`  Notes: ${r.notes}`);
    lines.push('');
  }
  return lines.join('\n');
}

function executeSetShelterPlan(args: Record<string, unknown>): string {
  const raw = localStorage.getItem('bugout-shelter');
  const shelter = raw ? JSON.parse(raw) : {};

  if (args.foodDays !== undefined) shelter.foodDays = args.foodDays;
  if (args.waterGallons !== undefined) shelter.waterGallons = args.waterGallons;
  if (args.tripwires) shelter.tripwires = args.tripwires;
  if (args.notes) shelter.notes = args.notes;

  localStorage.setItem('bugout-shelter', JSON.stringify(shelter));
  return `Shelter-in-place plan updated. Food: ${shelter.foodDays || '?'} days, Water: ${shelter.waterGallons || '?'} gallons, Tripwires: ${shelter.tripwires?.length || 0}`;
}

function executeGetShelterPlan(): string {
  const raw = localStorage.getItem('bugout-shelter');
  const shelter = raw ? JSON.parse(raw) : {};

  if (Object.keys(shelter).length === 0) {
    return 'No shelter-in-place plan configured. Use set_shelter_plan to log food reserves, water capacity, and bugout tripwire conditions.';
  }

  const lines = ['🏠 Shelter-in-Place Plan:', ''];
  if (shelter.foodDays) lines.push(`Food: ~${shelter.foodDays} days of reserves`);
  if (shelter.waterGallons) lines.push(`Water: ${shelter.waterGallons} gallons capacity`);
  if (shelter.tripwires?.length > 0) {
    lines.push('Bugout Tripwires (auto-leave conditions):');
    shelter.tripwires.forEach((t: string) => lines.push(`  ⚡ ${t}`));
  }
  if (shelter.notes) lines.push(`Notes: ${shelter.notes}`);
  return lines.join('\n');
}

function executeGetNextActions(): string {
  const settings = useSettingsStore.getState();
  const equipment = useEquipmentStore.getState();
  const threat = useThreatStore.getState();
  const rallyRaw = localStorage.getItem('bugout-rally');
  const rally = rallyRaw ? JSON.parse(rallyRaw) : {};
  const commsRaw = localStorage.getItem('bugout-comms');
  const comms = commsRaw ? JSON.parse(commsRaw) : {};
  const routesRaw = localStorage.getItem('bugout-routes');
  const routes = routesRaw ? JSON.parse(routesRaw) : {};
  const shelterRaw = localStorage.getItem('bugout-shelter');
  const shelter = shelterRaw ? JSON.parse(shelterRaw) : {};

  const actions: Array<{ priority: string; action: string; reason: string }> = [];

  // Check critical gaps
  if (!settings.location.city) {
    actions.push({ priority: '🔴 CRITICAL', action: 'Set your location in Settings', reason: 'All threat analysis and route planning depends on this' });
  }

  if (!threat.data) {
    actions.push({ priority: '🔴 CRITICAL', action: 'Run the threat monitor (node monitor/index.js)', reason: 'No threat data — you\'re flying blind' });
  }

  if (equipment.items.length === 0) {
    actions.push({ priority: '🔴 CRITICAL', action: 'Add your equipment to the inventory', reason: 'Can\'t analyze gaps without knowing what you have' });
  }

  const rallySet = Object.values(rally).filter(v => v && v !== '[Not set]').length;
  if (rallySet < 3) {
    actions.push({ priority: '🔴 CRITICAL', action: `Set ${3 - rallySet} more rally point(s)`, reason: 'If separated from your partner, rally points are your backup communication' });
  }

  if (!comms.outOfStateContact) {
    actions.push({ priority: '🟡 HIGH', action: 'Designate an out-of-state emergency contact', reason: 'Local calls may fail; long-distance often still works in disasters' });
  }

  if (!comms.primaryFrequency) {
    actions.push({ priority: '🟡 HIGH', action: 'Set your primary radio frequency', reason: 'You and your partner need pre-agreed frequencies' });
  }

  if (Object.keys(routes).length < 2) {
    actions.push({ priority: '🟡 HIGH', action: 'Configure at least 2 bugout routes', reason: 'One route may be blocked — always need alternatives' });
  }

  const wantedItems = equipment.items.filter(i => i.status === 'wanted');
  if (wantedItems.length > 0) {
    actions.push({ priority: '🟡 HIGH', action: `Purchase ${wantedItems.length} wanted items`, reason: `Shopping list: ${wantedItems.slice(0, 5).map(i => i.name).join(', ')}${wantedItems.length > 5 ? '...' : ''}` });
  }

  // Equipment category gaps
  const coveredCategories = new Set(equipment.items.filter(i => i.status !== 'wanted').map(i => i.category));
  const criticalCategories = ['Water', 'Food', 'Medical & Hygiene', 'Communications', 'Light'];
  const missingCritical = criticalCategories.filter(c => !coveredCategories.has(c));
  if (missingCritical.length > 0) {
    actions.push({ priority: '🟡 HIGH', action: `Fill equipment gaps in: ${missingCritical.join(', ')}`, reason: 'These categories are essential for 72-hour survival' });
  }

  if (!shelter.foodDays) {
    actions.push({ priority: '🟢 MEDIUM', action: 'Log your food reserves in shelter plan', reason: 'Knowing your shelter-in-place timeline affects bugout decisions' });
  }

  if (!shelter.tripwires || shelter.tripwires.length === 0) {
    actions.push({ priority: '🟢 MEDIUM', action: 'Set bugout tripwire conditions with your partner', reason: 'Pre-agreed conditions eliminate hesitation in a crisis' });
  }

  // Seasonal check
  const month = new Date().getMonth();
  if (month >= 3 && month <= 5) {
    actions.push({ priority: '🟢 MEDIUM', action: 'Tornado season prep: verify storm shelter access, check weather radio batteries', reason: 'April-June is peak tornado season in Nebraska' });
  }
  if (month >= 10 || month <= 2) {
    actions.push({ priority: '🟢 MEDIUM', action: 'Winter prep: pack cold weather layers, verify heat backup, check antifreeze', reason: 'Nebraska winters require specific cold-weather preparations' });
  }

  if (actions.length === 0) {
    return '🎉 Your plan looks comprehensive! Consider:\n• Doing a practice drill with your partner\n• Driving your bugout routes on a weekend\n• Testing all radios and Meshtastic devices\n• Rotating food and medication supplies';
  }

  const lines = ['📋 NEXT ACTIONS (prioritized):', ''];
  actions.slice(0, 10).forEach((a, i) => {
    lines.push(`${i + 1}. ${a.priority} ${a.action}`);
    lines.push(`   → ${a.reason}`);
    lines.push('');
  });

  return lines.join('\n');
}
