/**
 * Live Threat Scanner — fetches from OSINT APIs directly in the browser
 * and uses the configured LLM to analyze threat levels.
 *
 * All APIs used have CORS: * headers so they work from the browser.
 */

import { useSettingsStore } from '../store/useSettingsStore';
import { sendChatMessage, type AiClientConfig, type ChatMessage } from './aiClient';

export interface ScanSource {
  name: string;
  status: 'pending' | 'fetching' | 'ok' | 'error';
  data?: unknown;
  error?: string;
}

export interface ScanProgress {
  phase: string;
  sources: ScanSource[];
  complete: boolean;
  result?: ScanResult;
  error?: string;
}

export interface ScanResult {
  timestamp: string;
  assessment: {
    solar: ThreatLevel;
    nuclear: ThreatLevel;
    weather: ThreatLevel;
    overall: ThreatLevel;
    diamond?: {
      environmental: ThreatLevel;
      climate: ThreatLevel;
      hostile: ThreatLevel;
      trade: ThreatLevel;
      response: ThreatLevel;
      composite: ThreatLevel;
    };
  };
  sourceData: Record<string, unknown>;
  meta: {
    source: string;
    model: string;
    sourceCount: number;
  };
}

interface ThreatLevel {
  level: number;
  label: string;
  reasoning: string;
}

// ── API Fetchers ──

async function fetchSWPCKp(): Promise<{ currentKp: number; maxKp24h: number; stormLevel: string }> {
  const res = await fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json');
  if (!res.ok) throw new Error(`SWPC Kp: HTTP ${res.status}`);
  const data = await res.json();

  const recent = data.slice(-60); // last 60 minutes
  const currentKp = recent[recent.length - 1]?.kp_index ?? 0;
  const maxKp24h = Math.max(...data.slice(-1440).map((d: { kp_index: number }) => d.kp_index), 0);

  let stormLevel = 'Quiet';
  if (maxKp24h >= 9) stormLevel = 'G5 Extreme';
  else if (maxKp24h >= 8) stormLevel = 'G4 Severe';
  else if (maxKp24h >= 7) stormLevel = 'G3 Strong';
  else if (maxKp24h >= 6) stormLevel = 'G2 Moderate';
  else if (maxKp24h >= 5) stormLevel = 'G1 Minor';
  else if (maxKp24h >= 4) stormLevel = 'Unsettled';

  return { currentKp, maxKp24h, stormLevel };
}

async function fetchSWPCAlerts(): Promise<{ alertCount: number; highestGeomagScale: number; alerts: string[] }> {
  const res = await fetch('https://services.swpc.noaa.gov/products/alerts.json');
  if (!res.ok) throw new Error(`SWPC Alerts: HTTP ${res.status}`);
  const data = await res.json();

  let highestG = 0;
  const alerts: string[] = [];

  for (const alert of data.slice(0, 20)) {
    const msg = alert.message || '';
    alerts.push(msg.slice(0, 100));
    const gMatch = msg.match(/G(\d)/);
    if (gMatch) highestG = Math.max(highestG, parseInt(gMatch[1]));
  }

  return { alertCount: data.length, highestGeomagScale: highestG, alerts: alerts.slice(0, 5) };
}

async function fetchNASADonki(): Promise<{ cmeCount: number; flareCount: number; stormCount: number; hasEarthDirectedCME: boolean }> {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const settings = useSettingsStore.getState();
  const nasaKey = settings.apiKeys?.nasa || 'DEMO_KEY';

  const [cmeRes, flrRes, gstRes] = await Promise.allSettled([
    fetch(`https://api.nasa.gov/DONKI/CME?startDate=${fmt(start)}&endDate=${fmt(end)}&api_key=${nasaKey}`),
    fetch(`https://api.nasa.gov/DONKI/FLR?startDate=${fmt(start)}&endDate=${fmt(end)}&api_key=${nasaKey}`),
    fetch(`https://api.nasa.gov/DONKI/GST?startDate=${fmt(start)}&endDate=${fmt(end)}&api_key=${nasaKey}`),
  ]);

  const cmes = cmeRes.status === 'fulfilled' && cmeRes.value.ok ? await cmeRes.value.json() : [];
  const flares = flrRes.status === 'fulfilled' && flrRes.value.ok ? await flrRes.value.json() : [];
  const storms = gstRes.status === 'fulfilled' && gstRes.value.ok ? await gstRes.value.json() : [];

  const hasEarthDirectedCME = Array.isArray(cmes) && cmes.some((c: { cmeAnalyses?: Array<{ isMostAccurate: boolean; halfAngle?: number }> }) =>
    c.cmeAnalyses?.some(a => a.isMostAccurate && (a.halfAngle || 0) > 45)
  );

  return {
    cmeCount: Array.isArray(cmes) ? cmes.length : 0,
    flareCount: Array.isArray(flares) ? flares.length : 0,
    stormCount: Array.isArray(storms) ? storms.length : 0,
    hasEarthDirectedCME,
  };
}

async function fetchNWSAlerts(): Promise<{ count: number; alerts: Array<{ event: string; severity: string; headline: string }>; hasTornadoWarning: boolean; highestSeverity: string }> {
  const res = await fetch('https://api.weather.gov/alerts/active?area=NE', {
    headers: { 'User-Agent': '(BugoutMonitor, bugout-monitor@app)' },
  });
  if (!res.ok) throw new Error(`NWS: HTTP ${res.status}`);
  const data = await res.json();

  const features = data.features || [];
  const alerts = features.map((f: { properties: { event: string; severity: string; headline: string } }) => ({
    event: f.properties.event,
    severity: f.properties.severity,
    headline: f.properties.headline,
  }));

  const hasTornadoWarning = alerts.some((a: { event: string }) =>
    a.event.toLowerCase().includes('tornado') && a.event.toLowerCase().includes('warning')
  );

  const severityOrder = ['Unknown', 'Minor', 'Moderate', 'Severe', 'Extreme'];
  const highestSeverity = alerts.reduce((max: string, a: { severity: string }) => {
    return severityOrder.indexOf(a.severity) > severityOrder.indexOf(max) ? a.severity : max;
  }, 'Unknown');

  return { count: alerts.length, alerts: alerts.slice(0, 10), hasTornadoWarning, highestSeverity };
}

async function fetchGDELT(): Promise<{ nuclearArticles: number; militaryArticles: number; unrestArticles: number; avgTone: number }> {
  const queries = [
    { key: 'nuclear', q: 'nuclear+threat+OR+nuclear+war+OR+ICBM+OR+missile+launch' },
    { key: 'military', q: 'military+escalation+OR+military+mobilization+OR+NATO+alert' },
    { key: 'unrest', q: 'civil+unrest+OR+protest+OR+riot+united+states' },
  ];

  const results: Record<string, number> = {};
  let totalTone = 0;
  let toneCount = 0;

  for (const { key, q } of queries) {
    try {
      const res = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artcount&timespan=7d&format=json`);
      if (res.ok) {
        const text = await res.text();
        // GDELT returns article count as plain number or JSON
        const count = parseInt(text) || 0;
        results[key] = count;
      } else {
        results[key] = 0;
      }
    } catch {
      results[key] = 0;
    }
  }

  // Get tone for nuclear articles
  try {
    const toneRes = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=nuclear+threat+OR+nuclear+war&mode=tonechart&timespan=7d&format=json`);
    if (toneRes.ok) {
      const toneData = await toneRes.json();
      if (toneData && toneData.length > 0) {
        totalTone = toneData.reduce((s: number, d: { tone: number }) => s + (d.tone || 0), 0);
        toneCount = toneData.length;
      }
    }
  } catch { /* skip */ }

  return {
    nuclearArticles: results.nuclear || 0,
    militaryArticles: results.military || 0,
    unrestArticles: results.unrest || 0,
    avgTone: toneCount > 0 ? Math.round((totalTone / toneCount) * 100) / 100 : 0,
  };
}

// ── LLM Analysis ──

async function analyzeThreatWithLLM(sourceData: Record<string, unknown>): Promise<ScanResult['assessment']> {
  const settings = useSettingsStore.getState();
  const config: AiClientConfig = {
    provider: settings.aiProvider,
    openrouterKey: settings.openrouterKey,
    openrouterModel: settings.openrouterModel,
    lmstudioUrl: settings.lmstudioUrl,
    lmstudioModel: settings.lmstudioModel,
  };

  if (config.provider === 'none') {
    throw new Error('No AI provider configured');
  }

  const systemPrompt = `You are a threat analyst for disaster preparedness. Analyze the following OSINT data and return a JSON threat assessment. Be calibrated: the Doomsday Clock is at 89 seconds to midnight (closest ever), there is an active land war in Europe with nuclear-armed parties, and nuclear rhetoric is at post-Cold War highs. The nuclear baseline should reflect this reality (minimum 4/10).

Return ONLY valid JSON in this exact format:
{
  "solar": { "level": 1-10, "label": "Minimal|Low|Elevated|High|Severe|Extreme", "reasoning": "1-2 sentences" },
  "nuclear": { "level": 1-10, "label": "...", "reasoning": "..." },
  "weather": { "level": 1-10, "label": "...", "reasoning": "..." },
  "overall": { "level": 1-10, "label": "...", "reasoning": "..." },
  "diamond": {
    "environmental": { "level": 1-10, "label": "...", "reasoning": "..." },
    "climate": { "level": 1-10, "label": "...", "reasoning": "..." },
    "hostile": { "level": 1-10, "label": "...", "reasoning": "..." },
    "trade": { "level": 1-10, "label": "...", "reasoning": "..." },
    "response": { "level": 1-10, "label": "...", "reasoning": "..." },
    "composite": { "level": 1-10, "label": "...", "reasoning": "..." }
  }
}`;

  const userPrompt = `Analyze this OSINT data:\n\n${JSON.stringify(sourceData, null, 2)}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await sendChatMessage(config, messages);

  // Parse JSON from response (may have markdown code fences)
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('LLM did not return valid JSON');

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed;
}

function fallbackAnalysis(sourceData: Record<string, unknown>): ScanResult['assessment'] {
  const solar = sourceData.swpcKp as { currentKp: number; maxKp24h: number } | undefined;
  const weather = sourceData.nwsAlerts as { count: number; hasTornadoWarning: boolean } | undefined;

  const solarLevel = Math.min(10, Math.max(1, Math.round((solar?.maxKp24h || 0) * 1.1)));
  const weatherLevel = weather?.hasTornadoWarning ? 8 : Math.min(10, Math.max(1, (weather?.count || 0)));

  return {
    solar: { level: solarLevel, label: solarLevel <= 3 ? 'Low' : solarLevel <= 6 ? 'Elevated' : 'High', reasoning: `Kp ${solar?.maxKp24h || 0}, rule-based assessment` },
    nuclear: { level: 4, label: 'Elevated', reasoning: 'Baseline elevated: Doomsday Clock 89s, active conflicts (rule-based — connect AI for deeper analysis)' },
    weather: { level: weatherLevel, label: weatherLevel <= 3 ? 'Low' : weatherLevel <= 6 ? 'Elevated' : 'High', reasoning: `${weather?.count || 0} active alerts (rule-based)` },
    overall: { level: Math.max(solarLevel, 4, weatherLevel), label: 'Elevated', reasoning: 'Rule-based: max of individual levels' },
  };
}

// ── Main Scanner ──

export async function runLiveScan(onProgress: (progress: ScanProgress) => void): Promise<ScanResult> {
  const sources: ScanSource[] = [
    { name: 'NOAA SWPC Kp Index', status: 'pending' },
    { name: 'NOAA SWPC Alerts', status: 'pending' },
    { name: 'NASA DONKI', status: 'pending' },
    { name: 'NWS Weather Alerts', status: 'pending' },
    { name: 'GDELT Global News', status: 'pending' },
  ];

  const updateSource = (idx: number, update: Partial<ScanSource>) => {
    sources[idx] = { ...sources[idx], ...update };
    onProgress({ phase: 'Fetching data sources...', sources: [...sources], complete: false });
  };

  const sourceData: Record<string, unknown> = {};

  // Fetch all sources in parallel
  onProgress({ phase: 'Fetching data sources...', sources: [...sources], complete: false });

  const fetchers = [
    async () => {
      updateSource(0, { status: 'fetching' });
      try { const d = await fetchSWPCKp(); sourceData.swpcKp = d; updateSource(0, { status: 'ok', data: d }); }
      catch (e) { updateSource(0, { status: 'error', error: (e as Error).message }); }
    },
    async () => {
      updateSource(1, { status: 'fetching' });
      try { const d = await fetchSWPCAlerts(); sourceData.swpcAlerts = d; updateSource(1, { status: 'ok', data: d }); }
      catch (e) { updateSource(1, { status: 'error', error: (e as Error).message }); }
    },
    async () => {
      updateSource(2, { status: 'fetching' });
      try { const d = await fetchNASADonki(); sourceData.donki = d; updateSource(2, { status: 'ok', data: d }); }
      catch (e) { updateSource(2, { status: 'error', error: (e as Error).message }); }
    },
    async () => {
      updateSource(3, { status: 'fetching' });
      try { const d = await fetchNWSAlerts(); sourceData.nwsAlerts = d; updateSource(3, { status: 'ok', data: d }); }
      catch (e) { updateSource(3, { status: 'error', error: (e as Error).message }); }
    },
    async () => {
      updateSource(4, { status: 'fetching' });
      try { const d = await fetchGDELT(); sourceData.gdelt = d; updateSource(4, { status: 'ok', data: d }); }
      catch (e) { updateSource(4, { status: 'error', error: (e as Error).message }); }
    },
  ];

  await Promise.all(fetchers.map(f => f()));

  // Analyze with LLM
  onProgress({ phase: 'Analyzing threats with AI...', sources: [...sources], complete: false });

  let assessment: ScanResult['assessment'];
  let analysisSource = 'llm';
  let model = '';

  try {
    const settings = useSettingsStore.getState();
    model = settings.aiProvider === 'openrouter' ? settings.openrouterModel : settings.lmstudioModel || 'local';
    assessment = await analyzeThreatWithLLM(sourceData);
  } catch (llmErr) {
    console.warn('LLM analysis failed, using fallback:', llmErr);
    analysisSource = 'rule-based';
    assessment = fallbackAnalysis(sourceData);
  }

  const result: ScanResult = {
    timestamp: new Date().toISOString(),
    assessment,
    sourceData,
    meta: {
      source: analysisSource,
      model,
      sourceCount: sources.filter(s => s.status === 'ok').length,
    },
  };

  onProgress({ phase: 'Complete', sources: [...sources], complete: true, result });

  return result;
}
