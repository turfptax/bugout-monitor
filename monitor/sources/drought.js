/**
 * US Drought Monitor data for the user's county.
 * Maps to Diamond Factor 1: Environmental Damage
 *
 * Drought categories:
 *   None: No drought
 *   D0: Abnormally Dry
 *   D1: Moderate Drought
 *   D2: Severe Drought
 *   D3: Extreme Drought
 *   D4: Exceptional Drought
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

const USDM_URL = 'https://usdmdataservices.unl.edu/api/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent';

export async function fetchDrought() {
  try {
    const config = await loadConfig();
    const fipsCode = config.location.fipsCode;

    // Get the last 4 weeks of data for trend analysis
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);

    const params = new URLSearchParams({
      aoi: fipsCode,
      startdate: `${startDate.getMonth() + 1}/${startDate.getDate()}/${startDate.getFullYear()}`,
      enddate: `${endDate.getMonth() + 1}/${endDate.getDate()}/${endDate.getFullYear()}`,
      statisticsType: '1',
    });

    const response = await fetch(`${USDM_URL}?${params}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`USDM API returned ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('USDM returned empty data');
    }

    // Most recent week
    const latest = data[data.length - 1];

    // Drought percentages (cumulative -- d1 includes d2, d3, d4 area)
    const none = parseFloat(latest.none) || 0;
    const d0 = parseFloat(latest.d0) || 0;   // Abnormally Dry
    const d1 = parseFloat(latest.d1) || 0;   // Moderate
    const d2 = parseFloat(latest.d2) || 0;   // Severe
    const d3 = parseFloat(latest.d3) || 0;   // Extreme
    const d4 = parseFloat(latest.d4) || 0;   // Exceptional

    // Compute a severity score (0-100)
    const severityScore = Math.round(d0 * 0.2 + d1 * 0.4 + d2 * 0.6 + d3 * 0.8 + d4 * 1.0);

    // Determine highest active category
    let highestCategory = 'None';
    if (d4 > 0) highestCategory = 'D4 - Exceptional';
    else if (d3 > 0) highestCategory = 'D3 - Extreme';
    else if (d2 > 0) highestCategory = 'D2 - Severe';
    else if (d1 > 0) highestCategory = 'D1 - Moderate';
    else if (d0 > 0) highestCategory = 'D0 - Abnormally Dry';

    // Trend: compare latest to 4 weeks ago
    let trend = 'stable';
    if (data.length >= 2) {
      const oldest = data[0];
      const oldScore = (parseFloat(oldest.d0) || 0) * 0.2 +
                       (parseFloat(oldest.d1) || 0) * 0.4 +
                       (parseFloat(oldest.d2) || 0) * 0.6 +
                       (parseFloat(oldest.d3) || 0) * 0.8 +
                       (parseFloat(oldest.d4) || 0) * 1.0;
      const diff = severityScore - Math.round(oldScore);
      if (diff > 5) trend = 'worsening';
      else if (diff < -5) trend = 'improving';
    }

    return {
      county: latest.county || `${config.location.county} County`,
      mapDate: latest.mapDate,
      none: Math.round(none * 10) / 10,
      d0: Math.round(d0 * 10) / 10,
      d1: Math.round(d1 * 10) / 10,
      d2: Math.round(d2 * 10) / 10,
      d3: Math.round(d3 * 10) / 10,
      d4: Math.round(d4 * 10) / 10,
      severityScore,
      highestCategory,
      trend,
    };
  } catch (error) {
    return { status: 'UNAVAILABLE', error: error.message };
  }
}
