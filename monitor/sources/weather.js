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

export async function fetchWeather() {
  try {
    const config = await loadConfig();
    const state = config.location.state;
    const county = config.location.county;
    const ugcZone = config.location.ugcZone;

    const NWS_ALERTS_URL = `https://api.weather.gov/alerts/active?area=${state}`;

    // County identifiers for filtering
    const countyPatterns = [county];
    // Also add the base city from profile if available
    if (config.profile?.baseCityState) {
      const city = config.profile.baseCityState.split(',')[0].trim();
      if (city && !countyPatterns.includes(city)) {
        countyPatterns.push(city);
      }
    }

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
      const ugcCodes = props.geocode?.UGC || [];

      const matchesArea = countyPatterns.some(p => areaDesc.includes(p.toLowerCase()));
      const matchesUGC = ugcZone ? ugcCodes.includes(ugcZone) : false;

      return matchesArea || matchesUGC;
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
