/**
 * Bugout Threat Monitor -- Main Orchestrator
 *
 * Fetches threat data from multiple sources, analyzes via LLM (with fallback),
 * and injects a threat dashboard into the bugout plan HTML page.
 *
 * Usage: node index.js
 */

import { access, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __monitor_dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__monitor_dir, '.env') });

import { fetchSolar } from './sources/solar.js';
import { fetchWeather } from './sources/weather.js';
import { fetchNuclear } from './sources/nuclear.js';
import { fetchDONKI } from './sources/donki.js';
import { fetchSWPCAlerts } from './sources/swpc-alerts.js';
import { fetchGDELT } from './sources/gdelt.js';
import { fetchDrought } from './sources/drought.js';
import { fetchEconomic } from './sources/economic.js';
import { analyzeThreats } from './analysis/llm.js';
import { fallbackAnalysis } from './analysis/fallback.js';
import { generateDashboardHTML } from './output/dashboard.js';
import { injectDashboard } from './output/inject.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = resolve(__dirname, 'logs');

// --- Config check ---
try {
  await access(resolve(__dirname, '../user-config.json'));
} catch {
  console.error('No user-config.json found. Run "node setup.js" first.');
  process.exit(1);
}

async function main() {
  const timestamp = new Date().toISOString();
  const log = {
    timestamp,
    sources: {},
    llmUsed: false,
    assessment: null,
    errors: [],
  };

  console.log(`[${timestamp}] Bugout Threat Monitor starting...`);

  // --- Step 1: Fetch all data sources in parallel ---
  console.log('Fetching data sources...');
  const [solarResult, weatherResult, nuclearResult, donkiResult, swpcAlertsResult, gdeltResult, droughtResult, economicResult] = await Promise.allSettled([
    fetchSolar(),
    fetchWeather(),
    fetchNuclear(),
    fetchDONKI(),
    fetchSWPCAlerts(),
    fetchGDELT(),
    fetchDrought(),
    fetchEconomic(),
  ]);

  const unwrap = (result) =>
    result.status === 'fulfilled'
      ? result.value
      : { status: 'UNAVAILABLE', error: result.reason?.message || 'Unknown error' };

  const solarData = unwrap(solarResult);
  const weatherData = unwrap(weatherResult);
  const nuclearData = unwrap(nuclearResult);
  const donkiData = unwrap(donkiResult);
  const swpcAlertsData = unwrap(swpcAlertsResult);
  const gdeltData = unwrap(gdeltResult);
  const droughtData = unwrap(droughtResult);
  const economicData = unwrap(economicResult);

  log.sources = {
    solar: solarData.status === 'UNAVAILABLE' ? { status: 'UNAVAILABLE', error: solarData.error } : { status: 'OK', currentKp: solarData.currentKp, maxKp24h: solarData.maxKp24h },
    donki: donkiData.status === 'UNAVAILABLE' ? { status: 'UNAVAILABLE', error: donkiData.error } : { status: 'OK', cmes: donkiData.cmeCount, flares: donkiData.flareCount, storms: donkiData.stormCount },
    swpcAlerts: swpcAlertsData.status === 'UNAVAILABLE' ? { status: 'UNAVAILABLE', error: swpcAlertsData.error } : { status: 'OK', alertCount: swpcAlertsData.alertCount, highestG: swpcAlertsData.highestGeomagScale },
    weather: weatherData.status === 'UNAVAILABLE' ? { status: 'UNAVAILABLE', error: weatherData.error } : { status: 'OK', alertCount: weatherData.count },
    nuclear: nuclearData.status === 'UNAVAILABLE' ? { status: 'UNAVAILABLE', error: nuclearData.error } : { status: 'OK', headlineCount: nuclearData.headlineCount ?? nuclearData.headlines?.length ?? 0 },
    gdelt: gdeltData.status === 'UNAVAILABLE' ? { status: 'UNAVAILABLE', error: gdeltData.error } : { status: 'OK', nuclearArticles: gdeltData.nuclear?.articleCount, militaryArticles: gdeltData.military?.articleCount, unrestArticles: gdeltData.unrest?.articleCount },
    drought: droughtData.status === 'UNAVAILABLE' ? { status: 'UNAVAILABLE', error: droughtData.error } : { status: 'OK', highestCategory: droughtData.highestCategory, severityScore: droughtData.severityScore },
    economic: economicData.status === 'UNAVAILABLE' ? { status: 'UNAVAILABLE', error: economicData.error } : { status: 'OK', stressScore: economicData.stressScore },
  };

  console.log(`  Solar Kp: ${solarData.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : `Kp=${solarData.currentKp}, 24h max=${solarData.maxKp24h}`}`);
  console.log(`  DONKI: ${donkiData.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : `${donkiData.cmeCount} CME(s), ${donkiData.flareCount} flare(s), ${donkiData.stormCount} storm(s)`}`);
  console.log(`  SWPC Alerts: ${swpcAlertsData.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : `${swpcAlertsData.alertCount} alert(s), highest G-scale: G${swpcAlertsData.highestGeomagScale}`}`);
  console.log(`  Weather: ${weatherData.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : `${weatherData.count} alert(s)`}`);
  console.log(`  Nuclear RSS: ${nuclearData.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : `${nuclearData.headlines?.length || 0} headline(s)`}`);
  console.log(`  GDELT: ${gdeltData.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : `${gdeltData.totalArticleCount} article(s) across queries`}`);
  console.log(`  Drought: ${droughtData.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : `${droughtData.highestCategory}, severity ${droughtData.severityScore}/100`}`);
  console.log(`  Economic: ${economicData.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : `stress ${economicData.stressScore}/100`}`);

  // --- Step 2: Analyze threats via LLM (with fallback) ---
  let assessment;

  try {
    console.log('Sending to OpenRouter for LLM analysis...');
    assessment = await analyzeThreats(solarData, nuclearData, weatherData, donkiData, swpcAlertsData, gdeltData, droughtData, economicData);
    log.llmUsed = true;
    console.log(`  LLM analysis complete (model: ${assessment._meta?.model})`);
  } catch (llmError) {
    console.warn(`  LLM analysis failed: ${llmError.message}`);
    console.log('  Falling back to rule-based assessment...');
    log.errors.push(`LLM failed: ${llmError.message}`);
    assessment = fallbackAnalysis(solarData, nuclearData, weatherData, donkiData, swpcAlertsData, gdeltData, droughtData, economicData);
  }

  log.assessment = {
    solar: { level: assessment.solar.level, label: assessment.solar.label },
    nuclear: { level: assessment.nuclear.level, label: assessment.nuclear.label },
    weather: { level: assessment.weather.level, label: assessment.weather.label },
    overall: { level: assessment.overall.level, label: assessment.overall.label },
    diamond: assessment.diamond ? {
      environmental: assessment.diamond.environmental?.level,
      climate: assessment.diamond.climate?.level,
      hostile: assessment.diamond.hostile?.level,
      trade: assessment.diamond.trade?.level,
      response: assessment.diamond.response?.level,
      composite: assessment.diamond.composite?.level,
    } : undefined,
  };

  console.log(`\nThreat Levels:`);
  console.log(`  Solar:   ${assessment.solar.level}/10 (${assessment.solar.label})`);
  console.log(`  Nuclear: ${assessment.nuclear.level}/10 (${assessment.nuclear.label})`);
  console.log(`  Weather: ${assessment.weather.level}/10 (${assessment.weather.label})`);
  console.log(`  Overall: ${assessment.overall.level}/10 (${assessment.overall.label})`);
  if (assessment.diamond) {
    console.log(`\nDiamond Collapse Index:`);
    console.log(`  Environmental: ${assessment.diamond.environmental.level}/10`);
    console.log(`  Climate:       ${assessment.diamond.climate.level}/10`);
    console.log(`  Hostile:       ${assessment.diamond.hostile.level}/10`);
    console.log(`  Trade/Supply:  ${assessment.diamond.trade.level}/10`);
    console.log(`  Response:      ${assessment.diamond.response.level}/10`);
    console.log(`  Composite:     ${assessment.diamond.composite.level}/10 (${assessment.diamond.composite.label})`);
  }

  // --- Step 3: Generate and inject dashboard ---
  try {
    console.log('\nInjecting dashboard into index.html...');
    const sourceData = { solarData, donkiData, swpcAlertsData, weatherData, nuclearData, gdeltData, droughtData, economicData };
    const dashboardHTML = generateDashboardHTML(assessment, timestamp, sourceData);
    const writtenPath = await injectDashboard(dashboardHTML);
    console.log(`  Dashboard written to: ${writtenPath}`);
  } catch (injectError) {
    console.error(`  Dashboard injection failed: ${injectError.message}`);
    log.errors.push(`Injection failed: ${injectError.message}`);
  }

  // --- Step 4: Write log ---
  try {
    await mkdir(LOGS_DIR, { recursive: true });
    const logFilename = timestamp.replace(/[:.]/g, '-').replace('T', '_').slice(0, 19) + '.json';
    const logPath = resolve(LOGS_DIR, logFilename);
    await writeFile(logPath, JSON.stringify(log, null, 2), 'utf-8');
    console.log(`  Log written to: ${logPath}`);
  } catch (logError) {
    console.error(`  Log write failed: ${logError.message}`);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
