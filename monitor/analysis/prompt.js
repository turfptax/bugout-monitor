/**
 * LLM prompt templates for threat analysis.
 * Builds the system prompt dynamically from user-config.json.
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadConfig() {
  const raw = await readFile(resolve(__dirname, '../../user-config.json'), 'utf-8');
  return JSON.parse(raw);
}

// Cache the built prompt so we only read config once per run
let _cachedPrompt = null;

/**
 * Build the system prompt dynamically from user-config.json.
 */
export async function getSystemPrompt() {
  if (_cachedPrompt) return _cachedPrompt;

  const config = await loadConfig();
  const profile = config.profile || {};
  const location = config.location || {};

  const teamName = profile.teamName || 'a family';
  const teamSize = profile.teamSize || 'a small group';
  const baseCityState = profile.baseCityState || 'their location';
  const county = location.county || 'their county';
  const state = location.state || 'their state';

  // Build nearby targets context
  const nearbyTargets = location.nearbyTargets || [];
  let nearbyTargetsText = '';
  if (nearbyTargets.length > 0) {
    nearbyTargetsText = nearbyTargets.map(t => `- ${t}`).join('\n');
  }

  // Build bugout route context
  const routes = config.routes || {};
  let routeText = '';
  if (Object.keys(routes).length > 0) {
    const primary = routes.alpha || routes[Object.keys(routes)[0]];
    if (primary) {
      routeText = `- The team has a detailed bugout plan with routes ${primary.direction ? primary.direction.toLowerCase() : 'away from the area'}.`;
    }
  }

  // Build prevailing winds context
  const windsText = location.prevailingWinds
    ? `- Prevailing winds blow ${location.prevailingWinds}.`
    : '';

  _cachedPrompt = `You are a threat analyst providing daily risk assessment for ${teamName} (${teamSize}) in ${baseCityState}. You assess three threat categories for their disaster preparedness plan.

Key context:
${nearbyTargetsText ? `- Nearby strategic targets:\n${nearbyTargetsText}` : '- No specific nearby strategic targets identified.'}
${windsText}
${routeText}
- They monitor for: solar/geomagnetic events (Carrington-type), nuclear threats, severe weather (tornadoes, storms), and civil unrest.

CRITICAL GEOPOLITICAL BASELINE (as of early 2026):
- The Doomsday Clock is at 89 seconds to midnight -- the closest it has EVER been, set January 2025.
- There is an active large-scale land war in Europe (Russia-Ukraine conflict) involving a nuclear-armed state that has repeatedly made nuclear threats.
- NATO and Russia are in direct confrontation posture. Multiple NATO nations are providing weapons, intelligence, and training to Ukraine.
- Nuclear rhetoric from Russia has been at levels not seen since the Cuban Missile Crisis -- including changes to nuclear doctrine, suspension of arms control treaties (New START), and tactical nuclear weapons deployment to Belarus.
- The US and China are in increasing strategic competition with military tensions over Taiwan.
- Multiple nuclear-armed states are expanding their arsenals (China, Russia, North Korea).
- This is the most dangerous nuclear environment since the height of the Cold War.
- The BASELINE nuclear threat level in this environment should be 3-4 (Low), NOT 1-2. A "normal quiet day" in 2026 is still historically dangerous. Only if active de-escalation occurs (new treaties, ceasefire, diplomatic breakthroughs) should the baseline drop to 1-2.

You receive data from multiple intelligence sources:
- NOAA SWPC: Real-time Kp index (geomagnetic activity)
- NOAA SWPC Alerts: Official space weather watches/warnings (G/S/R scales)
- NASA DONKI: Coronal mass ejections, solar flares, geomagnetic storm events
- NWS: Active weather alerts for ${county} County, ${state}
- Arms control RSS feeds: Nuclear policy headlines
- GDELT: Global news monitoring for nuclear/military/unrest keywords with article volume and tone analysis

You also assess Jared Diamond's "Collapse" five-point framework -- the factors that cause societies to fail:
1. Environmental Damage -- resource depletion, drought, environmental degradation
2. Climate Change -- weather extremes pushing stressed systems past breaking points
3. Hostile Neighbors -- external military/political threats
4. Loss of Trading Partners -- supply chain breakdown, economic isolation
5. Society's Response -- whether institutions are addressing problems (most important factor)

You receive additional data for Diamond factors:
- US Drought Monitor: drought severity for ${county} County, ${state}
- FRED Economic Data: food CPI, consumer sentiment, unemployment, commodity prices, inflation expectations

Respond ONLY with valid JSON in this exact format -- no markdown, no code fences, just the JSON object:
{
  "solar": {
    "level": <number 1-10>,
    "label": "<one of: Minimal|Low|Elevated|High|Severe|Extreme>",
    "reasoning": "<1-2 sentences explaining the assessment>"
  },
  "nuclear": {
    "level": <number 1-10>,
    "label": "<one of: Minimal|Low|Elevated|High|Severe|Extreme>",
    "reasoning": "<1-2 sentences explaining the assessment>"
  },
  "weather": {
    "level": <number 1-10>,
    "label": "<one of: Minimal|Low|Elevated|High|Severe|Extreme>",
    "reasoning": "<1-2 sentences explaining the assessment>"
  },
  "overall": {
    "level": <number 1-10>,
    "label": "<one of: Minimal|Low|Elevated|High|Severe|Extreme>",
    "reasoning": "<1 sentence overall summary>"
  },
  "diamond": {
    "environmental": {
      "level": <number 1-10>,
      "reasoning": "<1 sentence -- drought, resource stress, environmental degradation>"
    },
    "climate": {
      "level": <number 1-10>,
      "reasoning": "<1 sentence -- extreme weather frequency, climate anomalies>"
    },
    "hostile": {
      "level": <number 1-10>,
      "reasoning": "<1 sentence -- external military/nuclear threats>"
    },
    "trade": {
      "level": <number 1-10>,
      "reasoning": "<1 sentence -- supply chain, food prices, economic isolation>"
    },
    "response": {
      "level": <number 1-10>,
      "reasoning": "<1 sentence -- institutional effectiveness, public trust, policy response>"
    },
    "composite": {
      "level": <number 1-10>,
      "label": "<one of: Minimal|Low|Elevated|High|Severe|Extreme>",
      "reasoning": "<1 sentence overall Diamond framework summary>"
    }
  }
}

Threat level scale:
  1-2: Minimal -- baseline conditions, no notable activity
  3-4: Low -- minor activity worth awareness, no action needed
  5-6: Elevated -- notable activity, review preparedness plans
  7-8: High -- significant threat developing, prepare to act
  9-10: Severe/Extreme -- imminent danger, execute emergency plans

Label mapping:
  1-2 -> Minimal
  3-4 -> Low
  5-6 -> Elevated
  7-8 -> High
  9 -> Severe
  10 -> Extreme

Be realistic and calibrated. Use the full 1-10 range appropriately.

For nuclear: The BASELINE in the current geopolitical environment (2025-2026) is 3-4 due to the factors listed above. This is NOT a normal peacetime period. A quiet news day with no new escalation is still a 3-4. New escalatory rhetoric, troop movements, nuclear posture changes, or treaty withdrawals push to 5-6. Direct confrontation between nuclear powers, launch warnings, or nuclear weapon use anywhere pushes to 7-10. Only active de-escalation (ceasefire, new treaties, diplomatic breakthroughs) should bring this below 3.

For GDELT data: article counts alone don't indicate threat -- the news always covers these topics. What matters is sudden SPIKES in volume compared to baseline, combined with highly negative tone and convergence across multiple sources. But remember the baseline is already elevated -- even "routine" coverage of the Russia-Ukraine war, NATO expansion, and nuclear modernization reflects a genuinely dangerous environment.

For solar: Most days should be 1-2. An Earth-directed CME combined with X-class flares and rising Kp is genuinely concerning. A few M-class flares with no Earth-directed CME is routine (level 1-3). Solar threat assessment should be independent of the geopolitical baseline.

For weather: Most days should be 1-2. Only raise when NWS alerts are active for ${county} County.`;

  return _cachedPrompt;
}

/**
 * Build the user prompt from collected source data.
 */
export async function buildUserPrompt(solarData, nuclearData, weatherData, donkiData, swpcAlertsData, gdeltData, droughtData, economicData) {
  const config = await loadConfig();
  const county = config.location?.county || 'Local';
  const state = config.location?.state || '';
  const countyLabel = `${county} County${state ? `, ${state}` : ''}`;

  const sections = [];

  // -- Solar / Carrington Section --
  sections.push('## SOLAR / CARRINGTON EVENT DATA');
  sections.push('');

  // SWPC Kp Index
  sections.push('### NOAA SWPC -- Real-Time Kp Index');
  if (solarData.status === 'UNAVAILABLE') {
    sections.push(`Data source unavailable: ${solarData.error}`);
  } else {
    sections.push(`- Current Kp Index: ${solarData.currentKp}`);
    sections.push(`- 24-hour Maximum Kp: ${solarData.maxKp24h}`);
    sections.push(`- 3-hour Average Kp: ${solarData.avgKp3h}`);
    sections.push(`- Current Condition: ${solarData.kpDescription}`);
    sections.push(`- Storm Level: ${solarData.stormLevel}`);
    sections.push('Kp reference: 0-2 Quiet, 3 Unsettled, 4 Active, 5 G1-Minor, 6 G2-Moderate, 7 G3-Strong, 8 G4-Severe, 9 G5-Extreme');
  }

  // SWPC Alerts
  sections.push('');
  sections.push('### NOAA SWPC -- Active Space Weather Alerts/Watches/Warnings');
  if (swpcAlertsData?.status === 'UNAVAILABLE') {
    sections.push(`Data source unavailable: ${swpcAlertsData.error}`);
  } else if (swpcAlertsData) {
    sections.push(`- Active alerts: ${swpcAlertsData.alertCount}`);
    sections.push(`- Highest Geomagnetic Storm scale: G${swpcAlertsData.highestGeomagScale} (G0=none, G5=extreme)`);
    sections.push(`- Highest Solar Radiation scale: S${swpcAlertsData.highestSolarRadScale}`);
    sections.push(`- Highest Radio Blackout scale: R${swpcAlertsData.highestRadioBlackout}`);
    sections.push(`- Active watch: ${swpcAlertsData.hasWatch ? 'YES' : 'No'}`);
    sections.push(`- Active warning: ${swpcAlertsData.hasWarning ? 'YES' : 'No'}`);
    if (swpcAlertsData.forecast) {
      sections.push(`- 1-day M-flare probability: ${swpcAlertsData.forecast.mFlareProb}%`);
      sections.push(`- 1-day X-flare probability: ${swpcAlertsData.forecast.xFlareProb}%`);
      sections.push(`- 1-day proton event probability: ${swpcAlertsData.forecast.protonProb}%`);
    }
    if (swpcAlertsData.alerts?.length > 0) {
      sections.push('Recent alert summaries:');
      swpcAlertsData.alerts.slice(0, 5).forEach((a, i) => {
        const scales = a.scales.map(s => s.label).join(', ') || 'none';
        sections.push(`  ${i + 1}. [${a.issueTime}] Scales: ${scales} -- ${a.message.slice(0, 150)}`);
      });
    }
  }

  // NASA DONKI
  sections.push('');
  sections.push('### NASA DONKI -- Space Weather Events (last 7 days)');
  if (donkiData?.status === 'UNAVAILABLE') {
    sections.push(`Data source unavailable: ${donkiData.error}`);
  } else if (donkiData) {
    sections.push(`- Earth-directed CMEs: ${donkiData.cmeCount} (Earth impact confirmed: ${donkiData.hasEarthDirectedCME ? 'YES' : 'No'})`);
    sections.push(`- Significant solar flares (M/X class): ${donkiData.flareCount} (X-class present: ${donkiData.hasXFlare ? 'YES' : 'No'})`);
    sections.push(`- Geomagnetic storms confirmed: ${donkiData.stormCount} (max Kp from storms: ${donkiData.maxStormKp})`);

    if (donkiData.cmes?.length > 0) {
      sections.push('CME details:');
      donkiData.cmes.forEach((c, i) => {
        sections.push(`  ${i + 1}. ${c.startTime} -- speed: ${c.speed || '?'} km/s, half-angle: ${c.halfAngle || '?'}, Earth impact: ${c.earthImpact ? 'YES' : 'No'}`);
      });
    }
    if (donkiData.flares?.length > 0) {
      sections.push('Significant flares:');
      donkiData.flares.forEach((f, i) => {
        sections.push(`  ${i + 1}. ${f.peakTime || f.beginTime} -- Class ${f.classType} at ${f.sourceLocation || 'unknown location'}`);
      });
    }
    if (donkiData.storms?.length > 0) {
      sections.push('Geomagnetic storms:');
      donkiData.storms.forEach((s, i) => {
        sections.push(`  ${i + 1}. ${s.startTime} -- max Kp: ${s.maxKpIndex}${s.linkedCME ? ` (linked to ${s.linkedCME})` : ''}`);
      });
    }
  }

  // -- Nuclear / Geopolitical Section --
  sections.push('');
  sections.push('## NUCLEAR / GEOPOLITICAL THREAT DATA');
  sections.push('');

  // RSS Headlines
  sections.push('### Arms Control & Nuclear Policy RSS (last 48h)');
  if (nuclearData.status === 'UNAVAILABLE') {
    sections.push(`Data source unavailable: ${nuclearData.error}`);
  } else {
    sections.push(`- Doomsday Clock: ${nuclearData.doomsdayClock.value} (as of ${nuclearData.doomsdayClock.lastUpdated})`);
    if (nuclearData.headlines.length === 0) {
      sections.push('No recent headlines from arms control / nuclear news sources.');
    } else {
      sections.push(`Recent headlines (${nuclearData.headlineCount} from last 48h):`);
      nuclearData.headlines.forEach((h, i) => {
        const note = h.note ? ` [${h.note}]` : '';
        sections.push(`  ${i + 1}. [${h.source}] ${h.title}${note}`);
      });
    }
    if (nuclearData.feedErrors) {
      sections.push(`Note: Some feeds had errors: ${nuclearData.feedErrors.join('; ')}`);
    }
  }

  // GDELT
  sections.push('');
  sections.push('### GDELT Global News Monitor (last 7 days)');
  if (gdeltData?.status === 'UNAVAILABLE') {
    sections.push(`Data source unavailable: ${gdeltData.error}`);
  } else if (gdeltData) {
    sections.push(`- Nuclear threat articles: ${gdeltData.nuclear?.articleCount || 0} (avg tone: ${gdeltData.nuclear?.tone || 0})`);
    sections.push(`- Military escalation articles: ${gdeltData.military?.articleCount || 0} (avg tone: ${gdeltData.military?.tone || 0})`);
    sections.push(`- US civil unrest articles: ${gdeltData.unrest?.articleCount || 0} (avg tone: ${gdeltData.unrest?.tone || 0})`);
    sections.push(`- Combined nuclear/military tone: ${gdeltData.avgNuclearMilitaryTone} (negative = concerning)`);
    sections.push('');
    sections.push('GDELT tone scale: typically ranges -10 to +10. Below -3 is notably negative. Below -5 is highly alarming.');

    if (gdeltData.topArticles?.length > 0) {
      sections.push('');
      sections.push('Top headlines from GDELT:');
      gdeltData.topArticles.slice(0, 10).forEach((a, i) => {
        sections.push(`  ${i + 1}. [${a.queryCategory}] ${a.title} (tone: ${a.tone}, source: ${a.source})`);
      });
    }
    if (gdeltData.errors) {
      sections.push(`Note: Some GDELT queries failed: ${gdeltData.errors.join('; ')}`);
    }
  }

  // -- Weather Section --
  sections.push('');
  sections.push(`## WEATHER / TORNADO DATA -- ${countyLabel}`);
  if (weatherData.status === 'UNAVAILABLE') {
    sections.push(`Data source unavailable: ${weatherData.error}`);
  } else if (weatherData.count === 0) {
    sections.push(`No active alerts for ${countyLabel}.`);
    if (weatherData.statewideSevereCount > 0) {
      sections.push(`Note: ${weatherData.statewideSevereCount} severe/extreme alerts active elsewhere in ${state || 'the state'}.`);
    }
  } else {
    sections.push(`${weatherData.count} active alert(s) for ${countyLabel}:`);
    weatherData.alerts.forEach((a, i) => {
      sections.push(`  ${i + 1}. ${a.event} (Severity: ${a.severity}, Urgency: ${a.urgency})`);
      sections.push(`     ${a.headline}`);
      if (a.instruction) {
        sections.push(`     Instruction: ${a.instruction}`);
      }
    });
    if (weatherData.hasTornadoWarning) {
      sections.push('');
      sections.push('WARNING: TORNADO WARNING is active -- this is a high-severity event.');
    }
  }

  // -- Diamond Framework Data --
  sections.push('');
  sections.push('## DIAMOND COLLAPSE FRAMEWORK DATA');
  sections.push('');

  // Drought (Factor 1: Environmental Damage)
  sections.push(`### US Drought Monitor -- ${countyLabel} (Factor 1: Environmental Damage)`);
  if (droughtData?.status === 'UNAVAILABLE') {
    sections.push(`Data source unavailable: ${droughtData?.error || 'unknown'}`);
  } else if (droughtData) {
    sections.push(`- Map date: ${droughtData.mapDate}`);
    sections.push(`- Highest drought category: ${droughtData.highestCategory}`);
    sections.push(`- Severity score: ${droughtData.severityScore}/100`);
    sections.push(`- 4-week trend: ${droughtData.trend}`);
    sections.push(`- Area breakdown: None=${droughtData.none}%, D0=${droughtData.d0}%, D1=${droughtData.d1}%, D2=${droughtData.d2}%, D3=${droughtData.d3}%, D4=${droughtData.d4}%`);
    sections.push('Drought scale: D0=Abnormally Dry, D1=Moderate, D2=Severe, D3=Extreme, D4=Exceptional');
  }

  // Economic indicators (Factor 4: Loss of Trading Partners / Supply Chain)
  sections.push('');
  sections.push('### FRED Economic Indicators (Factor 4: Trade/Supply Chain & Factor 5: Response)');
  if (economicData?.status === 'UNAVAILABLE') {
    sections.push(`Data source unavailable: ${economicData?.error || 'unknown'}`);
  } else if (economicData) {
    sections.push(`- Composite economic stress score: ${economicData.stressScore}/100`);
    const ind = economicData.indicators || {};
    for (const [key, val] of Object.entries(ind)) {
      if (val.available) {
        const yoy = val.yoyPct !== null ? ` (YoY: ${val.yoyPct > 0 ? '+' : ''}${val.yoyPct}%)` : '';
        sections.push(`- ${val.name}: ${val.value} ${val.unit}${yoy} [trend: ${val.trend}]`);
      }
    }
    sections.push('');
    sections.push('Key indicators for Diamond framework:');
    sections.push('- Consumer Sentiment below 50 = severe loss of public confidence (Factor 5)');
    sections.push('- Food CPI rising >5% YoY = supply chain stress (Factor 4)');
    sections.push('- Unemployment >6% = economic breakdown (Factor 4/5)');
    sections.push('- High inflation expectations = eroding economic stability (Factor 4)');
    if (economicData.errors?.length > 0) {
      sections.push(`Note: Some indicators had errors: ${economicData.errors.join('; ')}`);
    }
  }

  sections.push('');
  sections.push('Provide your threat assessment as JSON, including the Diamond framework analysis.');

  return sections.join('\n');
}
