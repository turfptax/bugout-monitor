/**
 * NASA DONKI (Space Weather Database of Notifications, Knowledge, Information)
 * Fetches recent CMEs, solar flares, and geomagnetic storms.
 *
 * These are the actual Carrington-relevant events — CMEs heading toward Earth,
 * X-class flares, and geomagnetic storm confirmations.
 *
 * Docs: https://api.nasa.gov (DONKI section)
 */

const DONKI_BASE = 'https://api.nasa.gov/DONKI';
const LOOKBACK_DAYS = 7;

/**
 * Fetch recent space weather events from NASA DONKI.
 */
export async function fetchDONKI() {
  const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';

  const startDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  const endDate = new Date().toISOString().slice(0, 10);

  const params = `startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`;

  try {
    const [cmeRes, flrRes, gstRes] = await Promise.allSettled([
      fetchJSON(`${DONKI_BASE}/CME?${params}`),
      fetchJSON(`${DONKI_BASE}/FLR?${params}`),
      fetchJSON(`${DONKI_BASE}/GST?${params}`),
    ]);

    const cmes = cmeRes.status === 'fulfilled' ? cmeRes.value : [];
    const flares = flrRes.status === 'fulfilled' ? flrRes.value : [];
    const storms = gstRes.status === 'fulfilled' ? gstRes.value : [];

    // Process CMEs — focus on Earth-directed ones
    const earthDirectedCMEs = (Array.isArray(cmes) ? cmes : []).filter(cme => {
      const analyses = cme.cmeAnalyses || [];
      return analyses.some(a =>
        a.isMostAccurate &&
        (a.halfAngle >= 30 || a.type === 'S') // wide CMEs or S-type (Earth-directed)
      );
    }).map(cme => {
      const analysis = cme.cmeAnalyses?.find(a => a.isMostAccurate) || cme.cmeAnalyses?.[0];
      return {
        activityID: cme.activityID,
        startTime: cme.startTime,
        type: analysis?.type || 'unknown',
        speed: analysis?.speed || null,
        halfAngle: analysis?.halfAngle || null,
        note: cme.note?.slice(0, 200),
        earthImpact: analysis?.enlilList?.some(e => e.isEarthGB) || false,
      };
    });

    // Process flares — focus on M and X class
    const significantFlares = (Array.isArray(flares) ? flares : []).filter(f => {
      const cls = (f.classType || '').toUpperCase();
      return cls.startsWith('M') || cls.startsWith('X');
    }).map(f => ({
      flrID: f.flrID,
      beginTime: f.beginTime,
      peakTime: f.peakTime,
      classType: f.classType,
      sourceLocation: f.sourceLocation,
    }));

    // Process geomagnetic storms
    const geomagStorms = (Array.isArray(storms) ? storms : []).map(s => {
      const maxKp = s.allKpIndex?.reduce((max, k) =>
        k.kpIndex > max ? k.kpIndex : max, 0) || 0;
      return {
        gstID: s.gstID,
        startTime: s.startTime,
        maxKpIndex: maxKp,
        linkedCME: s.linkedEvents?.find(e => e.activityID?.includes('CME'))?.activityID,
      };
    });

    return {
      cmes: earthDirectedCMEs,
      cmeCount: earthDirectedCMEs.length,
      flares: significantFlares,
      flareCount: significantFlares.length,
      storms: geomagStorms,
      stormCount: geomagStorms.length,
      lookbackDays: LOOKBACK_DAYS,
      hasEarthDirectedCME: earthDirectedCMEs.some(c => c.earthImpact),
      hasXFlare: significantFlares.some(f => f.classType?.toUpperCase().startsWith('X')),
      maxStormKp: geomagStorms.reduce((max, s) => Math.max(max, s.maxKpIndex), 0),
    };
  } catch (error) {
    return {
      status: 'UNAVAILABLE',
      error: error.message,
    };
  }
}

async function fetchJSON(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`DONKI returned ${res.status}`);
  return res.json();
}
