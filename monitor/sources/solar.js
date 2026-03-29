/**
 * Solar / Carrington Event data from NOAA Space Weather Prediction Center.
 * Fetches the planetary Kp index — the primary indicator of geomagnetic storm strength.
 *
 * Kp Scale:
 *   0-2: Quiet
 *   3:   Unsettled
 *   4:   Active
 *   5:   Minor storm (G1)
 *   6:   Moderate storm (G2)
 *   7:   Strong storm (G3)
 *   8:   Severe storm (G4)
 *   9:   Extreme storm (G5) — Carrington-level
 */

const SWPC_KP_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';

export async function fetchSolar() {
  try {
    const response = await fetch(SWPC_KP_URL, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`SWPC API returned ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('SWPC returned empty or invalid data');
    }

    // Data is an array of objects with time_tag and kp_index fields
    // Sorted chronologically — last entry is most recent
    const latest = data[data.length - 1];
    const currentKp = parseFloat(latest.kp_index);
    const timestamp = latest.time_tag;

    // Calculate 24-hour max Kp
    // Each entry is ~1 minute apart, so last 1440 entries ≈ 24 hours
    const last24h = data.slice(-1440);
    const maxKp24h = Math.max(...last24h.map(d => parseFloat(d.kp_index)));

    // Get the last 3 hours of readings for trend context
    const last3h = data.slice(-180);
    const avgKp3h = last3h.reduce((sum, d) => sum + parseFloat(d.kp_index), 0) / last3h.length;

    return {
      currentKp: Math.round(currentKp * 100) / 100,
      maxKp24h: Math.round(maxKp24h * 100) / 100,
      avgKp3h: Math.round(avgKp3h * 100) / 100,
      timestamp,
      kpDescription: describeKp(currentKp),
      stormLevel: getStormLevel(maxKp24h),
    };
  } catch (error) {
    return {
      status: 'UNAVAILABLE',
      error: error.message,
    };
  }
}

function describeKp(kp) {
  if (kp < 3) return 'Quiet';
  if (kp < 4) return 'Unsettled';
  if (kp < 5) return 'Active';
  if (kp < 6) return 'Minor storm (G1)';
  if (kp < 7) return 'Moderate storm (G2)';
  if (kp < 8) return 'Strong storm (G3)';
  if (kp < 9) return 'Severe storm (G4)';
  return 'Extreme storm (G5)';
}

function getStormLevel(kp) {
  if (kp < 5) return 'None';
  if (kp < 6) return 'G1 - Minor';
  if (kp < 7) return 'G2 - Moderate';
  if (kp < 8) return 'G3 - Strong';
  if (kp < 9) return 'G4 - Severe';
  return 'G5 - Extreme';
}
