/**
 * Weather / Tornado data from National Weather Service API.
 * Fetches active alerts for the user's state and filters to their county.
 *
 * NWS API requires a User-Agent header -- returns 403 without it.
 * No API key needed.
 *
 * Location is loaded dynamically from user-config.json.
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadConfig() {
  const raw = await readFile(resolve(__dirname, '../../user-config.json'), 'utf-8');
  return JSON.parse(raw);
}

const USER_AGENT = 'BugoutThreatMonitor/1.0 (bugout-monitor)';

/**
 * Build the list of UGC codes that identify the user's county.
 *
 * NWS tags an alert with forecast zones (NEZ066) or county codes (NEC109)
 * depending on the product, so both have to be matched. The configured
 * ugcZone may be a single code, a comma separated string, or an array.
 * The county code is derived from the FIPS code when one is configured
 * (state abbreviation + 'C' + the three county digits).
 */
export function buildUgcCodes(location = {}) {
  const codes = new Set();

  const configured = location.ugcZone;
  const list = Array.isArray(configured)
    ? configured
    : String(configured || '').split(/[,\s]+/);
  for (const entry of list) {
    const code = String(entry).trim().toUpperCase();
    if (code) codes.add(code);
  }

  const state = String(location.state || '').trim().toUpperCase();
  const fips = String(location.fipsCode || '').replace(/\D/g, '');
  const countyDigits = fips.slice(2);
  if (state && fips.length === 5 && countyDigits !== '000') {
    codes.add(`${state}C${countyDigits}`);
  }

  return [...codes];
}

export async function fetchWeather() {
  try {
    const config = await loadConfig();
    const state = config.location.state;
    const county = config.location.county;
    const ugcCodes = buildUgcCodes(config.location);

    const NWS_ALERTS_URL = `https://api.weather.gov/alerts/active?area=${state}`;

    // County name is a fallback for when the UGC codes do not match.
    // The base city name is deliberately not used: "Lincoln" also matches
    // Lincoln County, NE, which is 200 miles west of Lincoln in Lancaster County.
    const countyPatterns = county ? [String(county).toLowerCase()] : [];

    const response = await fetch(NWS_ALERTS_URL, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/geo+json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`NWS API returned ${response.status}`);
    }

    const data = await response.json();
    const features = data.features || [];

    // Filter for local county alerts
    const localAlerts = features.filter(f => {
      const props = f.properties;
      const areaDesc = (props.areaDesc || '').toLowerCase();
      const alertCodes = (props.geocode?.UGC || []).map(c => String(c).toUpperCase());

      const matchesUGC = ugcCodes.some(code => alertCodes.includes(code));
      const matchesArea = countyPatterns.some(p => areaDesc.includes(p));

      return matchesUGC || matchesArea;
    });

    // Extract and sort by severity
    const severityOrder = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };

    const alerts = localAlerts.map(f => {
      const p = f.properties;
      return {
        event: p.event,
        severity: p.severity,
        urgency: p.urgency,
        certainty: p.certainty,
        headline: p.headline,
        description: (p.description || '').slice(0, 300),
        instruction: (p.instruction || '').slice(0, 200),
        onset: p.onset,
        expires: p.expires,
        senderName: p.senderName,
      };
    }).sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));

    // Also get state-wide severe alerts for context
    const statewideSevere = features.filter(f => {
      const sev = f.properties.severity;
      return sev === 'Extreme' || sev === 'Severe';
    }).length;

    return {
      alerts,
      count: alerts.length,
      statewideSevereCount: statewideSevere,
      highestSeverity: alerts.length > 0 ? alerts[0].severity : 'None',
      hasTornadoWarning: alerts.some(a =>
        a.event?.toLowerCase().includes('tornado') && a.event?.toLowerCase().includes('warning')
      ),
      hasTornadoWatch: alerts.some(a =>
        a.event?.toLowerCase().includes('tornado') && a.event?.toLowerCase().includes('watch')
      ),
    };
  } catch (error) {
    return {
      status: 'UNAVAILABLE',
      error: error.message,
    };
  }
}
