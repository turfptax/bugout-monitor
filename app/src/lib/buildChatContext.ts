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

  // Equipment inventory
  if (equipment.items.length > 0) {
    const byCategory: Record<string, string[]> = {};
    for (const item of equipment.items) {
      const cat = item.category || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = [];
      const entry = item.qty && item.qty !== '1' ? `${item.name} (x${item.qty})` : item.name;
      byCategory[cat].push(entry);
    }

    const lines: string[] = [`EQUIPMENT INVENTORY (${equipment.items.length} items):`];
    for (const [cat, items] of Object.entries(byCategory)) {
      lines.push(`${cat}: ${items.join(', ')}`);
    }
    parts.push(lines.join('\n'));
  } else {
    parts.push('EQUIPMENT: The user has not logged any equipment yet.');
  }

  parts.push(
    'When making recommendations, be specific to their threat levels, location, and existing gear. ' +
    'Identify gaps and prioritize by urgency. Use clear formatting with headers and bullet points.'
  );

  return parts.join('\n\n');
}
