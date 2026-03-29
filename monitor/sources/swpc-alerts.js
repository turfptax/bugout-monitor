/**
 * NOAA SWPC Active Alerts / Watches / Warnings
 * Fetches current space weather alerts — G-scale geomagnetic storms,
 * S-scale solar radiation storms, R-scale radio blackouts.
 *
 * These are the official NOAA warnings, separate from the Kp index.
 * A G4/G5 watch or warning is the closest thing to a Carrington-event alert.
 *
 * Source: https://services.swpc.noaa.gov/products/alerts.json
 */

const SWPC_ALERTS_URL = 'https://services.swpc.noaa.gov/products/alerts.json';

// Also fetch the 3-day forecast for storm probabilities
const SWPC_3DAY_URL = 'https://services.swpc.noaa.gov/json/solar_probabilities.json';

export async function fetchSWPCAlerts() {
  try {
    const [alertsRes, forecastRes] = await Promise.allSettled([
      fetch(SWPC_ALERTS_URL, { signal: AbortSignal.timeout(15000) }),
      fetch(SWPC_3DAY_URL, { signal: AbortSignal.timeout(15000) }),
    ]);

    // Process alerts
    let alerts = [];
    if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
      const raw = await alertsRes.value.json();
      alerts = (Array.isArray(raw) ? raw : [])
        .filter(a => {
          // Only keep recent alerts (last 48 hours)
          const issued = new Date(a.issue_datetime);
          return (Date.now() - issued.getTime()) < 48 * 60 * 60 * 1000;
        })
        .map(a => ({
          productID: a.product_id,
          issueTime: a.issue_datetime,
          message: (a.message || '').slice(0, 300),
          // Extract storm scale from message (e.g., G3, S2, R1)
          scales: extractScales(a.message || ''),
        }));
    }

    // Process 3-day forecast probabilities
    let forecast = null;
    if (forecastRes.status === 'fulfilled' && forecastRes.value.ok) {
      const raw = await forecastRes.value.json();
      if (Array.isArray(raw) && raw.length > 0) {
        // Latest forecast entry
        const latest = raw[raw.length - 1];
        forecast = {
          date: latest.date_tag,
          mFlareProb: parseInt(latest['_m_class_1_day']) || 0,
          xFlareProb: parseInt(latest['_x_class_1_day']) || 0,
          protonProb: parseInt(latest['_10mev_proton_1_day']) || 0,
        };
      }
    }

    // Determine highest active scale level
    const allScales = alerts.flatMap(a => a.scales);
    const highestG = Math.max(0, ...allScales.filter(s => s.type === 'G').map(s => s.level));
    const highestS = Math.max(0, ...allScales.filter(s => s.type === 'S').map(s => s.level));
    const highestR = Math.max(0, ...allScales.filter(s => s.type === 'R').map(s => s.level));

    return {
      alerts: alerts.slice(0, 10), // Cap for prompt size
      alertCount: alerts.length,
      highestGeomagScale: highestG, // G1-G5
      highestSolarRadScale: highestS, // S1-S5
      highestRadioBlackout: highestR, // R1-R5
      forecast,
      hasWatch: alerts.some(a => a.message.toLowerCase().includes('watch')),
      hasWarning: alerts.some(a => a.message.toLowerCase().includes('warning')),
    };
  } catch (error) {
    return {
      status: 'UNAVAILABLE',
      error: error.message,
    };
  }
}

/**
 * Extract NOAA space weather scale references (G1-G5, S1-S5, R1-R5) from alert text.
 */
function extractScales(message) {
  const scales = [];
  const pattern = /\b([GSR])([1-5])\b/g;
  let match;
  while ((match = pattern.exec(message)) !== null) {
    scales.push({
      type: match[1],
      level: parseInt(match[2]),
      label: `${match[1]}${match[2]}`,
    });
  }
  return scales;
}
