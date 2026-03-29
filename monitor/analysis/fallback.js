/**
 * Rule-based fallback threat assessment when LLM is unavailable.
 * Uses simple thresholds to produce threat levels from raw data.
 */

export function fallbackAnalysis(solarData, nuclearData, weatherData, donkiData, swpcAlertsData, gdeltData, droughtData, economicData) {
  const solar = assessSolar(solarData, donkiData, swpcAlertsData);
  const nuclear = assessNuclear(nuclearData, gdeltData);
  const weather = assessWeather(weatherData);
  const diamond = assessDiamond(droughtData, economicData, weatherData, nuclearData, gdeltData);

  const maxLevel = Math.max(solar.level, nuclear.level, weather.level);

  return {
    solar,
    nuclear,
    weather,
    overall: {
      level: maxLevel,
      label: levelToLabel(maxLevel),
      reasoning: `Rule-based assessment (LLM unavailable). Highest individual threat: ${maxLevel}/10.`,
    },
    diamond,
    _meta: {
      source: 'fallback',
    },
  };
}

function assessSolar(data, donkiData, swpcAlertsData) {
  if (data.status === 'UNAVAILABLE') {
    return {
      level: 0,
      label: 'UNAVAILABLE',
      reasoning: `Data source could not be reached: ${data.error}`,
    };
  }

  const kp = data.maxKp24h;
  let level;

  if (kp < 2) level = 1;
  else if (kp < 3) level = 2;
  else if (kp < 4) level = 3;
  else if (kp < 5) level = 4;
  else if (kp < 6) level = 5;
  else if (kp < 7) level = 6;
  else if (kp < 8) level = 7;
  else if (kp < 9) level = 8;
  else level = 10;

  // Boost from DONKI events
  if (donkiData && donkiData.status !== 'UNAVAILABLE') {
    if (donkiData.hasEarthDirectedCME) level = Math.max(level, 6);
    if (donkiData.hasXFlare) level = Math.max(level, 5);
    if (donkiData.maxStormKp >= 7) level = Math.max(level, 7);
  }

  // Boost from SWPC alerts
  if (swpcAlertsData && swpcAlertsData.status !== 'UNAVAILABLE') {
    const g = swpcAlertsData.highestGeomagScale || 0;
    if (g >= 4) level = Math.max(level, 8);
    else if (g >= 3) level = Math.max(level, 6);
    else if (g >= 2) level = Math.max(level, 5);
    if (swpcAlertsData.hasWarning) level = Math.max(level, 5);
  }

  level = Math.min(level, 10);

  const parts = [`Kp=${data.currentKp} (24h max: ${data.maxKp24h}). ${data.kpDescription}.`];
  if (donkiData && donkiData.status !== 'UNAVAILABLE') {
    parts.push(`DONKI: ${donkiData.cmeCount} CME(s), ${donkiData.flareCount} flare(s).`);
  }
  if (swpcAlertsData && swpcAlertsData.status !== 'UNAVAILABLE' && swpcAlertsData.highestGeomagScale > 0) {
    parts.push(`SWPC: G${swpcAlertsData.highestGeomagScale} active.`);
  }

  return {
    level,
    label: levelToLabel(level),
    reasoning: parts.join(' ') + ' Rule-based assessment.',
  };
}

function assessNuclear(data, gdeltData) {
  if (data.status === 'UNAVAILABLE') {
    return {
      level: 0,
      label: 'UNAVAILABLE',
      reasoning: `Data source could not be reached: ${data.error}`,
    };
  }

  // Base level from Doomsday Clock position
  // The clock is in "X seconds to midnight" format — lower = worse
  // 89 seconds (2025) = closest ever → baseline 4
  // 90-120 seconds → baseline 4
  // 120-180 seconds → baseline 3
  // 180-300 seconds → baseline 2
  // 300+ seconds (5+ min) → baseline 1
  const clockSeconds = parseDoomsdayClock(data.doomsdayClock?.value);
  let level;
  if (clockSeconds <= 120) level = 4;       // Under 2 min — historically dangerous
  else if (clockSeconds <= 180) level = 3;  // 2-3 min — elevated baseline
  else if (clockSeconds <= 300) level = 2;  // 3-5 min — moderate
  else level = 1;                           // 5+ min — relatively calm

  // GDELT-based boost
  if (gdeltData && gdeltData.status !== 'UNAVAILABLE') {
    const nuclearCount = gdeltData.nuclear?.articleCount || 0;
    const militaryCount = gdeltData.military?.articleCount || 0;
    const tone = gdeltData.avgNuclearMilitaryTone || 0;

    // High article volume + negative tone = escalating
    if (nuclearCount >= 15 && tone < -5) level = Math.max(level, 7);
    else if (nuclearCount >= 10 && tone < -3) level = Math.max(level, 5);
    else if (nuclearCount >= 10 || militaryCount >= 10) level = Math.max(level, 4);
    else if (nuclearCount >= 5) level = Math.max(level, 3);
  }

  level = Math.min(level, 10);

  const parts = [`Doomsday Clock at ${data.doomsdayClock.value}. ${data.headlines.length} RSS headline(s).`];
  if (gdeltData && gdeltData.status !== 'UNAVAILABLE') {
    parts.push(`GDELT: ${gdeltData.nuclear?.articleCount || 0} nuclear, ${gdeltData.military?.articleCount || 0} military articles (tone: ${gdeltData.avgNuclearMilitaryTone}).`);
  }

  return {
    level,
    label: levelToLabel(level),
    reasoning: parts.join(' ') + ' Rule-based assessment.',
  };
}

function assessWeather(data) {
  if (data.status === 'UNAVAILABLE') {
    return {
      level: 0,
      label: 'UNAVAILABLE',
      reasoning: `Data source could not be reached: ${data.error}`,
    };
  }

  if (data.count === 0) {
    return {
      level: 1,
      label: 'Minimal',
      reasoning: 'No active weather alerts for your area.',
    };
  }

  if (data.hasTornadoWarning) {
    return {
      level: 9,
      label: 'Severe',
      reasoning: `TORNADO WARNING active for your area. ${data.count} total alert(s).`,
    };
  }

  if (data.hasTornadoWatch) {
    return {
      level: 6,
      label: 'Elevated',
      reasoning: `Tornado watch active for your area. ${data.count} total alert(s).`,
    };
  }

  const sev = data.highestSeverity;
  let level;
  if (sev === 'Extreme') level = 9;
  else if (sev === 'Severe') level = 7;
  else if (sev === 'Moderate') level = 5;
  else if (sev === 'Minor') level = 3;
  else level = 2;

  return {
    level,
    label: levelToLabel(level),
    reasoning: `${data.count} alert(s) for your area. Highest severity: ${sev}. Rule-based assessment.`,
  };
}

/**
 * Parse Doomsday Clock string into total seconds.
 * Handles formats like "89 seconds", "2 minutes", "1 minute 30 seconds", etc.
 */
function parseDoomsdayClock(value) {
  if (!value) return 120; // default to 2 min if unknown
  const str = value.toLowerCase();
  let total = 0;
  const minMatch = str.match(/(\d+)\s*min/);
  const secMatch = str.match(/(\d+)\s*sec/);
  if (minMatch) total += parseInt(minMatch[1]) * 60;
  if (secMatch) total += parseInt(secMatch[1]);
  return total || 120; // default if parse fails
}

function assessDiamond(droughtData, economicData, weatherData, nuclearData, gdeltData) {
  // Factor 1: Environmental Damage (drought)
  let envLevel = 2;
  let envReason = 'No significant drought data available.';
  if (droughtData && droughtData.status !== 'UNAVAILABLE') {
    const s = droughtData.severityScore;
    if (s >= 60) envLevel = 8;
    else if (s >= 40) envLevel = 6;
    else if (s >= 20) envLevel = 4;
    else if (s >= 5) envLevel = 3;
    else envLevel = 2;
    envReason = `Drought severity ${s}/100, highest: ${droughtData.highestCategory}, trend: ${droughtData.trend}. Rule-based.`;
  }

  // Factor 2: Climate Change (weather extremes — reuse weather data)
  let climLevel = 2;
  let climReason = 'No extreme weather patterns detected.';
  if (weatherData && weatherData.status !== 'UNAVAILABLE') {
    if (weatherData.hasTornadoWarning) climLevel = 8;
    else if (weatherData.hasTornadoWatch) climLevel = 5;
    else if (weatherData.count > 3) climLevel = 4;
    else if (weatherData.count > 0) climLevel = 3;
    climReason = `${weatherData.count} active weather alerts. Rule-based.`;
  }

  // Factor 3: Hostile Neighbors (reuse nuclear/military data)
  let hostLevel = 4; // Baseline elevated due to current geopolitical environment
  let hostReason = 'Baseline elevated due to active conflicts and nuclear rhetoric (2025-2026).';
  if (nuclearData && nuclearData.status !== 'UNAVAILABLE') {
    const clockSeconds = parseDoomsdayClock(nuclearData.doomsdayClock?.value);
    if (clockSeconds <= 90) hostLevel = Math.max(hostLevel, 5);
    if (clockSeconds <= 60) hostLevel = Math.max(hostLevel, 7);
  }
  if (gdeltData && gdeltData.status !== 'UNAVAILABLE') {
    const nuclearCount = gdeltData.nuclear?.articleCount || 0;
    const militaryCount = gdeltData.military?.articleCount || 0;
    const tone = gdeltData.avgNuclearMilitaryTone || 0;
    if (nuclearCount >= 15 && tone < -5) hostLevel = Math.max(hostLevel, 7);
    else if (nuclearCount >= 10) hostLevel = Math.max(hostLevel, 5);
    hostReason = `GDELT: ${nuclearCount} nuclear, ${militaryCount} military articles, tone: ${tone}. Rule-based.`;
  }

  // Factor 4: Loss of Trading Partners (economic/supply chain)
  let tradeLevel = 2;
  let tradeReason = 'No significant economic stress data available.';
  if (economicData && economicData.status !== 'UNAVAILABLE') {
    const stress = economicData.stressScore;
    if (stress >= 70) tradeLevel = 8;
    else if (stress >= 50) tradeLevel = 6;
    else if (stress >= 30) tradeLevel = 4;
    else if (stress >= 15) tradeLevel = 3;
    else tradeLevel = 2;
    tradeReason = `Economic stress ${stress}/100. Rule-based.`;
  }

  // Factor 5: Society's Response (consumer sentiment + institutional trust proxy)
  let respLevel = 3;
  let respReason = 'Moderate institutional confidence. Rule-based.';
  if (economicData && economicData.status !== 'UNAVAILABLE') {
    const sentiment = economicData.indicators?.consumerSentiment;
    if (sentiment?.available) {
      const val = sentiment.value;
      if (val < 40) { respLevel = 8; respReason = `Consumer sentiment critically low at ${val}. Rule-based.`; }
      else if (val < 50) { respLevel = 6; respReason = `Consumer sentiment poor at ${val}. Rule-based.`; }
      else if (val < 60) { respLevel = 5; respReason = `Consumer sentiment below average at ${val}. Rule-based.`; }
      else if (val < 70) { respLevel = 3; respReason = `Consumer sentiment moderate at ${val}. Rule-based.`; }
      else { respLevel = 2; respReason = `Consumer sentiment healthy at ${val}. Rule-based.`; }
    }
    // Civil unrest data from GDELT boosts this
    if (gdeltData && gdeltData.status !== 'UNAVAILABLE') {
      const unrestCount = gdeltData.unrest?.articleCount || 0;
      if (unrestCount >= 10) respLevel = Math.max(respLevel, 5);
      if (unrestCount >= 20) respLevel = Math.max(respLevel, 7);
    }
  }

  // Composite: weighted average (Factor 5 weighted higher per Diamond)
  const weights = { env: 1, clim: 1, host: 1.5, trade: 1.5, resp: 2 };
  const totalWeight = weights.env + weights.clim + weights.host + weights.trade + weights.resp;
  const compositeRaw = (
    envLevel * weights.env +
    climLevel * weights.clim +
    hostLevel * weights.host +
    tradeLevel * weights.trade +
    respLevel * weights.resp
  ) / totalWeight;
  const compositeLevel = Math.max(1, Math.min(10, Math.round(compositeRaw)));

  return {
    environmental: { level: envLevel, reasoning: envReason },
    climate: { level: climLevel, reasoning: climReason },
    hostile: { level: hostLevel, reasoning: hostReason },
    trade: { level: tradeLevel, reasoning: tradeReason },
    response: { level: respLevel, reasoning: respReason },
    composite: {
      level: compositeLevel,
      label: levelToLabel(compositeLevel),
      reasoning: `Weighted composite of all 5 Diamond factors. Rule-based assessment.`,
    },
  };
}

function levelToLabel(level) {
  if (level <= 0) return 'UNAVAILABLE';
  if (level <= 2) return 'Minimal';
  if (level <= 4) return 'Low';
  if (level <= 6) return 'Elevated';
  if (level <= 8) return 'High';
  if (level <= 9) return 'Severe';
  return 'Extreme';
}
