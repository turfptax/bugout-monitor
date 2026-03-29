import { useSettingsStore } from '../store/useSettingsStore';
import { useThreatStore } from '../store/useThreatStore';
import { useEquipmentStore } from '../store/useEquipmentStore';

export function buildChatSystemPrompt(): string {
  const settings = useSettingsStore.getState();
  const threat = useThreatStore.getState();
  const equipment = useEquipmentStore.getState();

  const parts: string[] = [];

  // Base role
  parts.push(
    'You are a disaster preparedness and survival advisor embedded in the Bugout Monitor app. ' +
    'You provide specific, actionable guidance based on the user\'s actual situation data. ' +
    'Be direct, practical, and reference their real data when relevant. Keep responses focused and useful.'
  );

  // Location context
  const { city, state, nearbyTargets } = settings.location;
  if (city || state) {
    let locStr = `The user is located in ${[city, state].filter(Boolean).join(', ')}.`;
    if (nearbyTargets.length > 0) {
      locStr += ` Nearby potential targets/concerns: ${nearbyTargets.join(', ')}.`;
    }
    parts.push(locStr);
  }

  // Threat data
  if (threat.data) {
    const a = threat.data.assessment;
    const lines: string[] = ['CURRENT THREAT ASSESSMENT:'];

    const addThreat = (name: string, t: { level: number; label: string; reasoning: string }) => {
      lines.push(`- ${name}: ${t.level}/10 (${t.label}) — ${t.reasoning}`);
    };

    addThreat('Overall', a.overall);
    addThreat('Solar/EMP', a.solar);
    addThreat('Nuclear', a.nuclear);
    addThreat('Weather', a.weather);

    if (a.diamond) {
      lines.push('Diamond Threat Index:');
      lines.push(`  Environmental: ${a.diamond.environmental.level}/10 — ${a.diamond.environmental.reasoning}`);
      lines.push(`  Climate: ${a.diamond.climate.level}/10 — ${a.diamond.climate.reasoning}`);
      lines.push(`  Hostile: ${a.diamond.hostile.level}/10 — ${a.diamond.hostile.reasoning}`);
      lines.push(`  Trade: ${a.diamond.trade.level}/10 — ${a.diamond.trade.reasoning}`);
      lines.push(`  Response: ${a.diamond.response.level}/10 — ${a.diamond.response.reasoning}`);
      lines.push(`  Composite: ${a.diamond.composite.level}/10 (${a.diamond.composite.label})`);
    }

    // Source data highlights
    const sd = threat.data.sourceData;
    if (sd.solarData) {
      lines.push(`Solar: Kp=${sd.solarData.currentKp}, 24h max Kp=${sd.solarData.maxKp24h}, storm level: ${sd.solarData.stormLevel}`);
    }
    if (sd.weatherData && sd.weatherData.count > 0) {
      lines.push(`Weather: ${sd.weatherData.count} active alerts, highest severity: ${sd.weatherData.highestSeverity}`);
      if (sd.weatherData.hasTornadoWarning) lines.push('  ** ACTIVE TORNADO WARNING **');
    }
    if (sd.nuclearData) {
      lines.push(`Nuclear: Doomsday Clock at ${sd.nuclearData.doomsdayClock.value}, ${sd.nuclearData.headlineCount} recent headlines`);
    }

    parts.push(lines.join('\n'));
  }

  // Equipment inventory — broken down by status
  if (equipment.items.length > 0) {
    const haveItems = equipment.items.filter(i => i.status === 'have' || !i.status);
    const wantedItems = equipment.items.filter(i => i.status === 'wanted');
    const orderedItems = equipment.items.filter(i => i.status === 'ordered');

    const formatItems = (items: typeof equipment.items) => {
      const byCategory: Record<string, string[]> = {};
      for (const item of items) {
        const cat = item.category || 'Uncategorized';
        if (!byCategory[cat]) byCategory[cat] = [];
        const entry = item.qty && item.qty !== '1' ? `${item.name} (x${item.qty})` : item.name;
        byCategory[cat].push(entry);
      }
      return Object.entries(byCategory).map(([cat, items]) => `  ${cat}: ${items.join(', ')}`).join('\n');
    };

    const lines: string[] = [
      `EQUIPMENT INVENTORY (${equipment.items.length} total items):`,
      '',
      `✅ OWNED (${haveItems.length} items the user ACTUALLY HAS in their possession):`,
    ];
    if (haveItems.length > 0) lines.push(formatItems(haveItems));
    else lines.push('  (none yet)');

    lines.push('');
    lines.push(`🎯 WANTED (${wantedItems.length} items the user NEEDS TO BUY — they do NOT have these yet):`);
    if (wantedItems.length > 0) lines.push(formatItems(wantedItems));
    else lines.push('  (none — all gaps filled!)');

    lines.push('');
    lines.push(`📦 ORDERED (${orderedItems.length} items PURCHASED but not yet received):`);
    if (orderedItems.length > 0) lines.push(formatItems(orderedItems));
    else lines.push('  (none)');

    lines.push('');
    lines.push(
      'CRITICAL DISTINCTION: "HAVE" means the user owns it and has it in their kit. ' +
      '"WANTED" means they have identified it as a gap but have NOT purchased it yet. ' +
      '"ORDERED" means purchased but not yet in their possession. ' +
      'When analyzing gaps, ONLY count "HAVE" items as actual coverage. ' +
      'WANTED and ORDERED items are still gaps until the user marks them as HAVE. ' +
      'When the AI adds items via tools, set status to "wanted" (not "have") unless the user explicitly says they already own it.'
    );

    parts.push(lines.join('\n'));
  } else {
    parts.push('EQUIPMENT: The user has not logged any equipment yet. They need to start building their kit from scratch.');
  }

  // Threat-based gear prioritization
  if (threat.data) {
    const a = threat.data.assessment;
    const priorities: string[] = [];

    if (a.nuclear.level >= 4) {
      priorities.push('- NUCLEAR (level ' + a.nuclear.level + '): Geiger counter, Faraday bags, KI (potassium iodide) tablets, N95 masks, plastic sheeting + duct tape for sealing rooms');
    }
    if (a.solar.level >= 4) {
      priorities.push('- SOLAR/EMP (level ' + a.solar.level + '): Solar panels, power banks, Faraday protection for electronics, hand-crank radio, cash (ATMs may be down)');
    }
    if (a.weather.level >= 4) {
      priorities.push('- WEATHER (level ' + a.weather.level + '): Emergency shelter/tarp, weather radio, first aid kit, water storage containers');
    }
    if (a.overall.level >= 5) {
      priorities.push('- OVERALL READINESS (level ' + a.overall.level + '): Focus on immediate readiness — 72hr food supply, water (1 gal/person/day), go-bags packed and staged');
    }

    if (priorities.length > 0) {
      parts.push(
        'CURRENT THREAT-BASED PRIORITIES:\n' +
        'Based on current threat levels, prioritize recommending the following gear:\n' +
        priorities.join('\n')
      );
    }
  }

  // Equipment status clarification
  parts.push(
    'EQUIPMENT STATUS:\n' +
    '- "have" = user physically owns this item and has it in their possession\n' +
    '- "wanted" = user wants to buy this but does NOT own it yet\n' +
    '- "ordered" = user has purchased but hasn\'t received yet\n' +
    'When suggesting new items, ALWAYS use status "wanted". NEVER mark AI-suggested items as "have".\n' +
    'Only items the user explicitly says they own should be "have".'
  );

  parts.push(
    'IMPORTANT: You have access to tools that let you READ and MODIFY the user\'s bugout data directly. ' +
    'USE THEM. When the user asks you to add equipment, check threats, analyze gaps, or update rally points — ' +
    'call the appropriate tool instead of just describing what to do.\n\n' +
    'EQUIPMENT STATUS RULES:\n' +
    '- When YOU (the AI) suggest or add items, ALWAYS set status="wanted" — the user does not have them yet.\n' +
    '- Only set status="have" if the user explicitly says "I already own this" or "I have this".\n' +
    '- When analyzing gaps, ONLY count items with status="have" as actual coverage.\n' +
    '- Items with status="wanted" or "ordered" are STILL GAPS in the user\'s preparedness.\n' +
    '- When reporting what the user has, clearly separate OWNED items from WANTED items.\n\n' +
    'For example:\n' +
    '- "Add a LifeStraw to my gear" → call add_equipment\n' +
    '- "What am I missing?" → call suggest_equipment_gaps AND get_equipment\n' +
    '- "Build me a basic comms kit" → call bulk_add_equipment with multiple items\n' +
    '- "What are the current threats?" → call get_threat_levels\n' +
    '- "Set my home rally point to 123 Elm St" → call set_rally_point\n' +
    '- "What should I do next?" → call get_next_actions\n' +
    '- "How prepared am I?" → call get_plan_status\n' +
    '- "What\'s my nuclear plan?" → call get_scenario_plan with scenario="nuclear"\n' +
    '- "Set up my comms" → call update_comms_plan\n' +
    '- "We have 60 lbs of rice" → call set_shelter_plan\n' +
    '- "Plan a route northwest" → call update_bugout_route\n\n' +
    'FULL TOOL LIST: get_threat_levels, get_osint_summary, get_equipment, add_equipment, ' +
    'bulk_add_equipment, remove_equipment, suggest_equipment_gaps, get_rally_points, set_rally_point, ' +
    'get_location, get_plan_status, get_scenario_plan, update_comms_plan, get_comms_plan, ' +
    'update_bugout_route, get_bugout_routes, set_shelter_plan, get_shelter_plan, get_next_actions\n\n' +
    'After using tools, summarize what you did and make personalized recommendations. ' +
    'Be specific to their threat levels, location, and existing gear. ' +
    'Prioritize by urgency. Use clear formatting.'
  );

  return parts.join('\n\n');
}
