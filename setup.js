#!/usr/bin/env node
/**
 * Bugout Monitor — Interactive Setup Wizard
 *
 * Walks new users through configuration:
 *  1. Location (city/state → auto-lookup county, FIPS, UGC, lat/lon)
 *  2. Team info
 *  3. Nearby military/nuclear targets
 *  4. LLM provider + API keys
 *  5. Generates user-config.json and .env
 *  6. Offers to run first threat scan
 *
 * Usage: node setup.js
 */

import { createInterface } from 'node:readline';
import { writeFile, readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function banner() {
  console.log(`
${BOLD}${CYAN}╔══════════════════════════════════════════════════╗
║          BUGOUT MONITOR — SETUP WIZARD           ║
╚══════════════════════════════════════════════════╝${RESET}

${DIM}This wizard will configure the threat monitor for your location.
All personal data is stored locally in user-config.json (never committed to git).${RESET}
`);
}

// ── NWS API Location Lookup ──

async function lookupLocation(lat, lon) {
  try {
    const url = `https://api.weather.gov/points/${lat},${lon}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BugoutMonitorSetup/1.0 (github.com/bugout-monitor)' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      county: data.properties?.county?.split('/').pop() || '',
      state: data.properties?.relativeLocation?.properties?.state || '',
      city: data.properties?.relativeLocation?.properties?.city || '',
      forecastZone: data.properties?.forecastZone?.split('/').pop() || '',
      countyWarningArea: data.properties?.county?.split('/').pop() || '',
    };
  } catch { return null; }
}

async function geocodeCity(cityState) {
  // Try Nominatim (OpenStreetMap) — works with just city names
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityState)}&format=json&limit=1&countrycodes=us`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BugoutMonitorSetup/1.0 (github.com/bugout-monitor)' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      matchedAddress: data[0].display_name,
    };
  } catch { return null; }
}

async function lookupFIPS(state, county) {
  try {
    const url = `https://api.census.gov/data/2020/dec/pl?get=NAME&for=county:*&in=state:*`;
    // Simplified — use state FIPS codes
    const stateFIPS = STATE_FIPS[state.toUpperCase()] || '';
    if (!stateFIPS) return '';
    // For now, return common format — user can verify
    return stateFIPS + '000'; // placeholder — setup will refine
  } catch { return ''; }
}

const STATE_FIPS = {
  AL:'01',AK:'02',AZ:'04',AR:'05',CA:'06',CO:'08',CT:'09',DE:'10',FL:'12',GA:'13',
  HI:'15',ID:'16',IL:'17',IN:'18',IA:'19',KS:'20',KY:'21',LA:'22',ME:'23',MD:'24',
  MA:'25',MI:'26',MN:'27',MS:'28',MO:'29',MT:'30',NE:'31',NV:'32',NH:'33',NJ:'34',
  NM:'35',NY:'36',NC:'37',ND:'38',OH:'39',OK:'40',OR:'41',PA:'42',RI:'44',SC:'45',
  SD:'46',TN:'47',TX:'48',UT:'49',VT:'50',VA:'51',WA:'53',WV:'54',WI:'55',WY:'56',
  DC:'11'
};

// ── Main Setup Flow ──

async function main() {
  banner();

  // Check if already configured
  try {
    await access(resolve(__dirname, 'user-config.json'));
    const overwrite = await ask(`${YELLOW}⚠ user-config.json already exists. Overwrite? (y/N): ${RESET}`);
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled. Your existing config is unchanged.');
      rl.close();
      return;
    }
  } catch { /* file doesn't exist, proceed */ }

  // ── Step 1: Location ──
  console.log(`${BOLD}${GREEN}━━━ Step 1: Your Location ━━━${RESET}\n`);

  const cityState = await ask(`${CYAN}Enter your city and state (e.g., "Lincoln, NE"): ${RESET}`);

  console.log(`${DIM}Looking up location data...${RESET}`);
  const geo = await geocodeCity(cityState);

  let lat, lon, state, county, ugcZone, fipsCode, city;

  if (geo) {
    lat = geo.lat;
    lon = geo.lon;
    console.log(`${GREEN}✓ Found: ${geo.matchedAddress} (${lat}, ${lon})${RESET}`);

    const nws = await lookupLocation(lat, lon);
    if (nws) {
      state = nws.state;
      county = nws.county;
      city = nws.city;
      ugcZone = nws.forecastZone;
      const stateFips = STATE_FIPS[state] || '';
      console.log(`${GREEN}✓ County: ${county}, State: ${state}, NWS Zone: ${ugcZone}${RESET}`);

      // Ask for FIPS code
      fipsCode = await ask(`${CYAN}County FIPS code (${DIM}look up at census.gov, e.g., "31109" for Lancaster Co, NE${RESET}${CYAN}): ${RESET}`);
      if (!fipsCode) fipsCode = stateFips + '000';
    }
  }

  if (!lat) {
    console.log(`${YELLOW}Could not auto-detect. Enter manually:${RESET}`);
    lat = parseFloat(await ask(`${CYAN}Latitude: ${RESET}`));
    lon = parseFloat(await ask(`${CYAN}Longitude: ${RESET}`));
    state = await ask(`${CYAN}State abbreviation (e.g., NE): ${RESET}`);
    county = await ask(`${CYAN}County name: ${RESET}`);
    ugcZone = await ask(`${CYAN}NWS UGC zone code (e.g., NEZ055): ${RESET}`);
    fipsCode = await ask(`${CYAN}County FIPS code (e.g., 31109): ${RESET}`);
    city = cityState.split(',')[0].trim();
  }

  // ── Step 2: Team Info ──
  console.log(`\n${BOLD}${GREEN}━━━ Step 2: Your Team ━━━${RESET}\n`);

  const teamName = await ask(`${CYAN}Team/family name (e.g., "The Smiths") ${DIM}[optional]${RESET}: `) || 'My Team';
  const teamSize = await ask(`${CYAN}Team size (e.g., "2 adults, 1 child") ${DIM}[default: 2 adults]${RESET}: `) || '2 adults';

  // ── Step 3: Nearby Threats ──
  console.log(`\n${BOLD}${GREEN}━━━ Step 3: Nearby Military / Nuclear Targets ━━━${RESET}\n`);
  console.log(`${DIM}List any military bases, nuclear plants, ICBM fields, or strategic targets near you.`);
  console.log(`These help the AI assess your nuclear/fallout risk. Leave blank if none.${RESET}\n`);

  const targets = [];
  let addMore = true;
  while (addMore) {
    const target = await ask(`${CYAN}Target (e.g., "Offutt AFB, 50mi NE") ${DIM}[blank to skip/finish]${RESET}: `);
    if (target.trim()) {
      targets.push(target.trim());
    } else {
      addMore = false;
    }
  }

  const winds = await ask(`${CYAN}Prevailing wind direction in your area ${DIM}[default: west-to-east]${RESET}: `) || 'west-to-east';

  // ── Step 4: LLM Configuration ──
  console.log(`\n${BOLD}${GREEN}━━━ Step 4: AI Configuration ━━━${RESET}\n`);
  console.log(`${DIM}The threat monitor uses an LLM to analyze OSINT data and assess threat levels.`);
  console.log(`Without an LLM, it falls back to rule-based analysis (still works, less nuanced).${RESET}\n`);

  console.log(`  1. ${BOLD}OpenRouter${RESET} ${DIM}(recommended — $0.01/scan, many models)${RESET}`);
  console.log(`  2. ${BOLD}No LLM${RESET} ${DIM}(rule-based fallback only — free, works offline)${RESET}`);

  const llmChoice = await ask(`\n${CYAN}Choose (1-2) ${DIM}[default: 1]${RESET}: `) || '1';

  let openrouterKey = '';
  let model = 'google/gemini-2.0-flash-001';

  if (llmChoice === '1') {
    console.log(`\n${DIM}Get a free key at: https://openrouter.ai/keys${RESET}`);
    openrouterKey = await ask(`${CYAN}OpenRouter API key: ${RESET}`);
    const customModel = await ask(`${CYAN}Model ${DIM}[default: google/gemini-2.0-flash-001]${RESET}: `);
    if (customModel.trim()) model = customModel.trim();
  }

  // NASA API key (optional)
  console.log(`\n${DIM}Optional: NASA API key enables space weather event data (CME, flares).`);
  console.log(`Get a free key at: https://api.nasa.gov — or use DEMO_KEY for testing.${RESET}`);
  const nasaKey = await ask(`${CYAN}NASA API key ${DIM}[default: DEMO_KEY]${RESET}: `) || 'DEMO_KEY';

  // ── Generate Config ──
  console.log(`\n${BOLD}${GREEN}━━━ Generating Configuration ━━━${RESET}\n`);

  const config = {
    profile: {
      teamName,
      teamSize,
      baseCityState: `${city || cityState.split(',')[0].trim()}, ${state}`,
    },
    location: {
      lat,
      lon,
      state,
      county,
      ugcZone,
      fipsCode,
      nearbyTargets: targets,
      prevailingWinds: winds,
    },
    routes: {
      alpha: { name: 'Primary', direction: '', path: '', distance: '', driveTime: '', waypoints: [] },
      bravo: { name: 'Alternate', direction: '', path: '', distance: '', driveTime: '', waypoints: [] },
      charlie: { name: 'On Foot', direction: '', path: '', distance: '', driveTime: '', waypoints: [] },
    },
    comms: {
      privateFreq: '',
      backupFreq: '',
      frsChannel: '',
      meshtasticChannel: '',
      outOfStateContact: '',
    },
    rallyPoints: {
      '1': { name: 'Home', description: '' },
      '2': { name: '', description: '' },
      '3': { name: '', description: '' },
    },
    llm: {
      provider: llmChoice === '1' ? 'openrouter' : 'none',
      model,
    },
  };

  // Write user-config.json
  const configPath = resolve(__dirname, 'user-config.json');
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`${GREEN}✓ user-config.json written${RESET}`);

  // Write .env
  const envContent = [
    `OPENROUTER_API_KEY=${openrouterKey || 'your-key-here'}`,
    `OPENROUTER_MODEL=${model}`,
    `NASA_API_KEY=${nasaKey}`,
  ].join('\n') + '\n';

  const envPath = resolve(__dirname, 'monitor', '.env');
  await writeFile(envPath, envContent, 'utf-8');
  console.log(`${GREEN}✓ monitor/.env written${RESET}`);

  // ── Update index.html with location ──
  try {
    const htmlPath = resolve(__dirname, 'index.html');
    let html = await readFile(htmlPath, 'utf-8');
    html = html.replace(/\[YOUR_CITY_STATE\]/g, config.profile.baseCityState);
    html = html.replace(/\[YOUR_TEAM_NAME\]/g, config.profile.teamName);
    html = html.replace(/\[YOUR_TEAM_SIZE\]/g, config.profile.teamSize);
    await writeFile(htmlPath, html, 'utf-8');
    console.log(`${GREEN}✓ index.html personalized${RESET}`);
  } catch (e) {
    console.log(`${YELLOW}⚠ Could not update index.html: ${e.message}${RESET}`);
  }

  // ── Offer to run first scan ──
  console.log(`\n${BOLD}${GREEN}━━━ Setup Complete! ━━━${RESET}\n`);
  console.log(`Your config is saved. Here's what you can do next:\n`);
  console.log(`  ${CYAN}npm run monitor${RESET}    Run a threat scan and update the dashboard`);
  console.log(`  ${CYAN}npm run serve${RESET}      Start a local web server to view the dashboard`);
  console.log(`  ${CYAN}open index.html${RESET}    View your disaster plan in the browser\n`);

  const runNow = await ask(`${CYAN}Run your first threat scan now? (Y/n): ${RESET}`);

  if (runNow.toLowerCase() !== 'n') {
    console.log(`\n${DIM}Running threat monitor...${RESET}\n`);
    try {
      execSync('node monitor/index.js', { cwd: __dirname, stdio: 'inherit' });
    } catch (e) {
      console.log(`\n${YELLOW}⚠ First scan encountered issues. You can run it again with: npm run monitor${RESET}`);
    }
  }

  console.log(`\n${GREEN}${BOLD}You're all set!${RESET} Open index.html in your browser to see your dashboard.`);
  console.log(`${DIM}Edit user-config.json anytime to update your location, routes, or team info.${RESET}\n`);

  rl.close();
}

main().catch(err => {
  console.error(`${RED}Setup error: ${err.message}${RESET}`);
  rl.close();
  process.exit(1);
});
