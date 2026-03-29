/**
 * Generates the threat dashboard HTML to inject into index.html.
 * Includes threat level cards AND a detailed OSINT intelligence section.
 */

const START_MARKER = '<!-- THREAT-MONITOR-START -->';
const END_MARKER = '<!-- THREAT-MONITOR-END -->';

export { START_MARKER, END_MARKER };

/**
 * Generate the threat dashboard HTML string.
 */
export function generateDashboardHTML(assessment, timestamp, sourceData = {}) {
  const ts = new Date(timestamp);
  const formatted = ts.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const source = assessment._meta?.source === 'llm' ? 'AI' : 'Rule-based';
  const model = assessment._meta?.model || '';
  const sourceCount = 8; // SWPC Kp, SWPC Alerts, DONKI, NWS, RSS, GDELT, Drought, FRED

  const cards = [
    { key: 'solar', icon: '☀️', title: 'Solar / Carrington' },
    { key: 'nuclear', icon: '☢️', title: 'Nuclear Threat' },
    { key: 'weather', icon: '🌪️', title: 'Weather / Tornado' },
    { key: 'overall', icon: '🎯', title: 'Overall Threat' },
  ];

  const cardHTML = cards.map(c => {
    const data = assessment[c.key];
    const isUnavailable = data.label === 'UNAVAILABLE';
    const color = isUnavailable ? 'var(--text-dim)' : levelColor(data.level);
    const badgeClass = isUnavailable ? '' : levelBadgeClass(data.level);
    const levelDisplay = isUnavailable ? '—' : `${data.level}/10`;

    return `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:0.75rem 1rem;border-left:3px solid ${color};min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.35rem;">
          <div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.icon} ${c.title}</div>
        </div>
        <div style="display:flex;align-items:baseline;gap:0.5rem;margin-bottom:0.35rem;">
          <div style="font-size:1.5rem;font-weight:700;color:${color};line-height:1;">${levelDisplay}</div>
          ${isUnavailable
            ? '<span style="font-size:0.7rem;padding:0.1rem 0.4rem;border-radius:3px;background:rgba(139,148,158,0.2);color:var(--text-dim);border:1px solid rgba(139,148,158,0.3);">UNAVAILABLE</span>'
            : `<span class="badge ${badgeClass}" style="font-size:0.65rem;">${data.label}</span>`
          }
        </div>
        <div style="font-size:0.78rem;color:var(--text-dim);line-height:1.35;">${data.reasoning}</div>
      </div>`;
  }).join('\n');

  // Build Diamond Collapse Index
  const diamondHTML = assessment.diamond ? buildDiamondCard(assessment.diamond) : '';

  // Build the OSINT section
  const osintHTML = buildOSINTSection(sourceData);

  return `${START_MARKER}
<style>
  .osint-panel { background:var(--surface);border-bottom:1px solid var(--border);padding:0 2rem 1.5rem; }
  .osint-inner { max-width:1400px;margin:0 auto; }
  .osint-toggle { cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0; }
  .osint-toggle h3 { font-size:0.8rem;color:var(--accent2);text-transform:uppercase;letter-spacing:1.5px;margin:0;padding:0; }
  .osint-toggle .arrow { color:var(--text-dim);font-size:0.75rem;transition:transform 0.2s; }
  .osint-body { display:none;padding-bottom:0.5rem; }
  .osint-panel.open .osint-body { display:block; }
  .osint-panel.open .arrow { transform:rotate(180deg); }
  .osint-grid { display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:0.75rem; }
  .osint-card { background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:1rem;overflow:hidden; }
  .osint-card h4 { font-size:0.75rem;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin:0 0 0.75rem 0;padding:0 0 0.5rem;border-bottom:1px solid var(--border); }
  .osint-row { display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0;font-size:0.8rem; }
  .osint-row .label { color:var(--text-dim); }
  .osint-row .value { color:var(--text);font-weight:600;font-variant-numeric:tabular-nums; }
  .osint-headline { padding:0.35rem 0;font-size:0.78rem;color:var(--text-dim);border-bottom:1px solid rgba(48,54,61,0.5);line-height:1.4; }
  .osint-headline:last-child { border-bottom:none; }
  .osint-headline .src { color:var(--accent2);font-size:0.68rem;font-weight:600;text-transform:uppercase;margin-right:0.4rem; }
  .osint-headline .tone-neg { color:var(--red); }
  .osint-headline .tone-pos { color:var(--green); }
  .osint-headline .tone-neut { color:var(--text-dim); }
  .osint-status { display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:0.4rem;vertical-align:middle; }
  .osint-status.ok { background:var(--green); }
  .osint-status.err { background:var(--red); }
  .osint-source-list { margin-top:0.75rem; }
  .osint-source-item { display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0;font-size:0.78rem; }
  .osint-source-item .name { color:var(--text);flex:1; }
  .osint-source-item .detail { color:var(--text-dim);font-size:0.72rem; }
  .osint-meter { height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin-top:0.2rem; }
  .osint-meter-fill { height:100%;border-radius:2px;transition:width 0.3s; }
  @media (max-width:900px) { .osint-grid { grid-template-columns:1fr; } }
</style>
<div style="background:var(--surface);border-bottom:2px solid var(--border);padding:1rem 2rem;">
  <div style="max-width:1400px;margin:0 auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem;">
      <h2 style="font-size:1rem;color:var(--accent);text-transform:uppercase;letter-spacing:1.5px;border:none;margin:0;padding:0;">
        &#128737;&#65039; Threat Monitor
      </h2>
      <div style="display:flex;align-items:center;gap:1rem;">
        <span style="font-size:0.7rem;color:var(--text-dim);padding:0.15rem 0.5rem;background:var(--surface2);border-radius:3px;border:1px solid var(--border);">${source}${model ? ` &middot; ${model}` : ''} &middot; ${sourceCount} sources</span>
        <span style="font-size:0.75rem;color:var(--text-dim);">
          Updated: ${formatted}
        </span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem;">
${cardHTML}
    </div>
${diamondHTML}
  </div>
</div>
${osintHTML}
<script>
document.querySelectorAll('.osint-toggle').forEach(el => {
  el.addEventListener('click', () => el.closest('.osint-panel').classList.toggle('open'));
});
</script>
${END_MARKER}`;
}

/**
 * Build the OSINT intelligence detail section.
 */
function buildOSINTSection(data) {
  const { solarData, donkiData, swpcAlertsData, weatherData, nuclearData, gdeltData, droughtData, economicData } = data;

  // — Source status indicators —
  const sources = [
    { name: 'NOAA SWPC Kp Index', ok: solarData?.status !== 'UNAVAILABLE', detail: solarData?.status !== 'UNAVAILABLE' ? `Kp ${solarData.currentKp} (24h max: ${solarData.maxKp24h})` : 'Unavailable' },
    { name: 'NOAA SWPC Alerts', ok: swpcAlertsData?.status !== 'UNAVAILABLE', detail: swpcAlertsData?.status !== 'UNAVAILABLE' ? `${swpcAlertsData.alertCount} alert(s)` : 'Unavailable' },
    { name: 'NASA DONKI', ok: donkiData?.status !== 'UNAVAILABLE', detail: donkiData?.status !== 'UNAVAILABLE' ? `${donkiData.cmeCount} CME, ${donkiData.flareCount} flare, ${donkiData.stormCount} storm` : 'Unavailable' },
    { name: 'NWS Weather Alerts', ok: weatherData?.status !== 'UNAVAILABLE', detail: weatherData?.status !== 'UNAVAILABLE' ? `${weatherData.count} alert(s) your county` : 'Unavailable' },
    { name: 'Arms Control RSS', ok: nuclearData?.status !== 'UNAVAILABLE', detail: nuclearData?.status !== 'UNAVAILABLE' ? `${nuclearData.headlines?.length || 0} headline(s)` : 'Unavailable' },
    { name: 'GDELT Global News', ok: gdeltData?.status !== 'UNAVAILABLE', detail: gdeltData?.status !== 'UNAVAILABLE' ? `${gdeltData.totalArticleCount || 0} article(s)` : 'Unavailable' },
    { name: 'US Drought Monitor', ok: droughtData?.status !== 'UNAVAILABLE', detail: droughtData?.status !== 'UNAVAILABLE' ? `${droughtData.highestCategory}, severity ${droughtData.severityScore}/100` : 'Unavailable' },
    { name: 'FRED Economic Data', ok: economicData?.status !== 'UNAVAILABLE', detail: economicData?.status !== 'UNAVAILABLE' ? `Stress ${economicData.stressScore}/100` : 'Unavailable' },
  ];

  const sourcesOnline = sources.filter(s => s.ok).length;

  const sourceListHTML = sources.map(s => `
    <div class="osint-source-item">
      <span class="osint-status ${s.ok ? 'ok' : 'err'}"></span>
      <span class="name">${s.name}</span>
      <span class="detail">${s.detail}</span>
    </div>`).join('');

  // — Solar Intelligence Card —
  const solarCardHTML = buildSolarCard(solarData, donkiData, swpcAlertsData);

  // — Nuclear / Geopolitical Intelligence Card —
  const nuclearCardHTML = buildNuclearCard(nuclearData, gdeltData);

  // — Weather Card —
  const weatherCardHTML = buildWeatherCard(weatherData);

  // — GDELT Analysis Card —
  const gdeltCardHTML = buildGDELTCard(gdeltData);

  return `
<div class="osint-panel">
  <div class="osint-inner">
    <div class="osint-toggle">
      <h3>&#128225; OSINT Intelligence Feed &mdash; ${sourcesOnline}/${sources.length} sources online</h3>
      <span class="arrow">&#9660;</span>
    </div>
    <div class="osint-body">
      <div class="osint-grid">
        ${solarCardHTML}
        ${nuclearCardHTML}
        ${weatherCardHTML}
        ${gdeltCardHTML}
      </div>
      <div class="osint-card" style="margin-top:1rem;">
        <h4>&#128752; Source Status</h4>
        ${sourceListHTML}
      </div>
    </div>
  </div>
</div>`;
}

function buildSolarCard(solarData, donkiData, swpcAlertsData) {
  if (solarData?.status === 'UNAVAILABLE') {
    return `<div class="osint-card"><h4>&#9728;&#65039; Solar / Space Weather</h4><div style="color:var(--text-dim);font-size:0.8rem;">Data unavailable</div></div>`;
  }

  const kpColor = kpLevelColor(solarData?.maxKp24h || 0);
  const kpPct = Math.min(100, ((solarData?.maxKp24h || 0) / 9) * 100);

  // SWPC alert info
  let swpcLine = '';
  if (swpcAlertsData && swpcAlertsData.status !== 'UNAVAILABLE') {
    const gScale = swpcAlertsData.highestGeomagScale || 0;
    const hasWarn = swpcAlertsData.hasWarning;
    const hasWatch = swpcAlertsData.hasWatch;
    let swpcStatus = `G${gScale}`;
    if (hasWarn) swpcStatus += ' ⚠ WARNING';
    else if (hasWatch) swpcStatus += ' WATCH';
    swpcLine = `
      <div class="osint-row"><span class="label">SWPC Geomag Scale</span><span class="value" style="color:${gScale >= 3 ? 'var(--yellow)' : gScale >= 4 ? 'var(--red)' : 'var(--text)'};">${swpcStatus}</span></div>
      <div class="osint-row"><span class="label">Radio Blackout</span><span class="value">R${swpcAlertsData.highestRadioBlackout || 0}</span></div>`;
    if (swpcAlertsData.forecast) {
      swpcLine += `
      <div class="osint-row"><span class="label">M-flare prob (24h)</span><span class="value">${swpcAlertsData.forecast.mFlareProb}%</span></div>
      <div class="osint-row"><span class="label">X-flare prob (24h)</span><span class="value" style="color:${swpcAlertsData.forecast.xFlareProb > 10 ? 'var(--yellow)' : 'var(--text)'};">${swpcAlertsData.forecast.xFlareProb}%</span></div>`;
    }
  }

  // DONKI events
  let donkiLine = '';
  if (donkiData && donkiData.status !== 'UNAVAILABLE') {
    const earthCME = donkiData.hasEarthDirectedCME;
    const xFlare = donkiData.hasXFlare;
    donkiLine = `
      <div class="osint-row"><span class="label">CMEs (7d)</span><span class="value">${donkiData.cmeCount}${earthCME ? ' <span style="color:var(--red);font-size:0.7rem;">EARTH-DIRECTED</span>' : ''}</span></div>
      <div class="osint-row"><span class="label">M/X Flares (7d)</span><span class="value" style="color:${xFlare ? 'var(--red)' : 'var(--text)'};">${donkiData.flareCount}${xFlare ? ' (X-class!)' : ''}</span></div>
      <div class="osint-row"><span class="label">Geomag Storms (7d)</span><span class="value">${donkiData.stormCount}${donkiData.maxStormKp > 0 ? ` (max Kp: ${donkiData.maxStormKp})` : ''}</span></div>`;
  }

  return `
    <div class="osint-card">
      <h4>&#9728;&#65039; Solar / Space Weather Intel</h4>
      <div class="osint-row"><span class="label">Current Kp Index</span><span class="value" style="color:${kpColor};">${solarData.currentKp}</span></div>
      <div class="osint-row"><span class="label">24h Max Kp</span><span class="value" style="color:${kpColor};">${solarData.maxKp24h}</span></div>
      <div class="osint-meter"><div class="osint-meter-fill" style="width:${kpPct}%;background:${kpColor};"></div></div>
      <div class="osint-row"><span class="label">Condition</span><span class="value">${solarData.kpDescription}</span></div>
      <div class="osint-row"><span class="label">Storm Level</span><span class="value">${solarData.stormLevel}</span></div>
      ${swpcLine}
      ${donkiLine}
    </div>`;
}

function buildNuclearCard(nuclearData, gdeltData) {
  if (nuclearData?.status === 'UNAVAILABLE') {
    return `<div class="osint-card"><h4>&#9762;&#65039; Nuclear / Geopolitical Intel</h4><div style="color:var(--text-dim);font-size:0.8rem;">Data unavailable</div></div>`;
  }

  const clock = nuclearData.doomsdayClock;
  const headlines = nuclearData.headlines || [];

  let headlineHTML = '';
  if (headlines.length > 0) {
    headlineHTML = `<div style="margin-top:0.75rem;border-top:1px solid var(--border);padding-top:0.5rem;">
      <div style="font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.4rem;">Recent Headlines</div>
      ${headlines.slice(0, 6).map(h => `<div class="osint-headline"><span class="src">${esc(h.source)}</span>${esc(h.title)}</div>`).join('')}
    </div>`;
  }

  // GDELT nuclear/military summary
  let gdeltSummary = '';
  if (gdeltData && gdeltData.status !== 'UNAVAILABLE') {
    gdeltSummary = `
      <div class="osint-row"><span class="label">GDELT Nuclear Articles</span><span class="value">${gdeltData.nuclear?.articleCount || 0}</span></div>
      <div class="osint-row"><span class="label">GDELT Military Articles</span><span class="value">${gdeltData.military?.articleCount || 0}</span></div>
      <div class="osint-row"><span class="label">Avg Tone (nuclear/mil)</span><span class="value ${(gdeltData.avgNuclearMilitaryTone || 0) < -3 ? 'tone-neg' : ''}" style="color:${toneColor(gdeltData.avgNuclearMilitaryTone || 0)};">${gdeltData.avgNuclearMilitaryTone || 0}</span></div>`;
  }

  return `
    <div class="osint-card">
      <h4>&#9762;&#65039; Nuclear / Geopolitical Intel</h4>
      <div class="osint-row"><span class="label">Doomsday Clock</span><span class="value" style="color:var(--yellow);">${clock.value}</span></div>
      <div class="osint-row"><span class="label">Clock Updated</span><span class="value">${clock.lastUpdated}</span></div>
      <div class="osint-row"><span class="label">RSS Headlines (48h)</span><span class="value">${nuclearData.headlineCount || 0}</span></div>
      ${gdeltSummary}
      ${headlineHTML}
    </div>`;
}

function buildWeatherCard(weatherData) {
  if (weatherData?.status === 'UNAVAILABLE') {
    return `<div class="osint-card"><h4>&#127786;&#65039; Weather / Tornado Intel</h4><div style="color:var(--text-dim);font-size:0.8rem;">Data unavailable</div></div>`;
  }

  let alertsHTML = '';
  if (weatherData.count > 0) {
    alertsHTML = `<div style="margin-top:0.75rem;border-top:1px solid var(--border);padding-top:0.5rem;">
      <div style="font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.4rem;">Active Alerts</div>
      ${weatherData.alerts.slice(0, 5).map(a => {
        const sevColor = a.severity === 'Extreme' ? 'var(--red)' : a.severity === 'Severe' ? 'var(--red)' : a.severity === 'Moderate' ? 'var(--yellow)' : 'var(--text-dim)';
        return `<div class="osint-headline"><span style="color:${sevColor};font-weight:600;font-size:0.72rem;">${esc(a.event)}</span> — ${esc(a.headline || '')}</div>`;
      }).join('')}
    </div>`;
  }

  const tornadoBadge = weatherData.hasTornadoWarning
    ? '<span style="background:rgba(248,81,73,0.2);color:var(--red);padding:0.1rem 0.4rem;border-radius:3px;font-size:0.7rem;font-weight:700;border:1px solid rgba(248,81,73,0.4);">TORNADO WARNING</span>'
    : weatherData.hasTornadoWatch
    ? '<span style="background:rgba(210,153,34,0.2);color:var(--yellow);padding:0.1rem 0.4rem;border-radius:3px;font-size:0.7rem;font-weight:700;border:1px solid rgba(210,153,34,0.4);">TORNADO WATCH</span>'
    : '';

  return `
    <div class="osint-card">
      <h4>&#127786;&#65039; Weather / Tornado Intel</h4>
      <div class="osint-row"><span class="label">your county Alerts</span><span class="value">${weatherData.count} ${tornadoBadge}</span></div>
      <div class="osint-row"><span class="label">Highest Severity</span><span class="value">${weatherData.highestSeverity || 'None'}</span></div>
      <div class="osint-row"><span class="label">Statewide Severe/Extreme</span><span class="value">${weatherData.statewideSevereCount || 0}</span></div>
      ${alertsHTML}
    </div>`;
}

function buildGDELTCard(gdeltData) {
  if (gdeltData?.status === 'UNAVAILABLE') {
    return `<div class="osint-card"><h4>&#127760; GDELT Global News Monitor</h4><div style="color:var(--text-dim);font-size:0.8rem;">Data unavailable</div></div>`;
  }

  const nuclearCount = gdeltData.nuclear?.articleCount || 0;
  const militaryCount = gdeltData.military?.articleCount || 0;
  const unrestCount = gdeltData.unrest?.articleCount || 0;

  // Top articles
  let articlesHTML = '';
  const topArticles = gdeltData.topArticles || [];
  if (topArticles.length > 0) {
    articlesHTML = `<div style="margin-top:0.75rem;border-top:1px solid var(--border);padding-top:0.5rem;">
      <div style="font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.4rem;">Top Articles (7d)</div>
      ${topArticles.slice(0, 8).map(a => {
        const tColor = toneColor(a.tone || 0);
        return `<div class="osint-headline"><span class="src">${esc(a.queryCategory || '')}</span>${esc(a.title || 'Untitled')} <span style="color:${tColor};font-size:0.68rem;">(${a.tone > 0 ? '+' : ''}${a.tone})</span></div>`;
      }).join('')}
    </div>`;
  }

  // Volume bars
  const maxCount = Math.max(nuclearCount, militaryCount, unrestCount, 1);

  return `
    <div class="osint-card">
      <h4>&#127760; GDELT Global News Monitor (7d)</h4>
      <div class="osint-row"><span class="label">Nuclear Threat</span><span class="value">${nuclearCount} articles</span></div>
      <div class="osint-meter"><div class="osint-meter-fill" style="width:${(nuclearCount / maxCount) * 100}%;background:var(--red);"></div></div>
      <div class="osint-row"><span class="label">Military Escalation</span><span class="value">${militaryCount} articles</span></div>
      <div class="osint-meter"><div class="osint-meter-fill" style="width:${(militaryCount / maxCount) * 100}%;background:var(--yellow);"></div></div>
      <div class="osint-row"><span class="label">US Civil Unrest</span><span class="value">${unrestCount} articles</span></div>
      <div class="osint-meter"><div class="osint-meter-fill" style="width:${(unrestCount / maxCount) * 100}%;background:var(--accent2);"></div></div>
      <div class="osint-row" style="margin-top:0.5rem;"><span class="label">Combined Tone</span><span class="value" style="color:${toneColor(gdeltData.avgNuclearMilitaryTone || 0)};">${gdeltData.avgNuclearMilitaryTone || 0} <span style="font-size:0.68rem;font-weight:400;color:var(--text-dim);">(neg = concerning)</span></span></div>
      ${articlesHTML}
    </div>`;
}

/**
 * Build the Diamond Collapse Index card.
 */
function buildDiamondCard(diamond) {
  const factors = [
    { key: 'environmental', icon: '🌿', label: '1. Environmental Damage' },
    { key: 'climate',       icon: '🌡️', label: '2. Climate Change' },
    { key: 'hostile',       icon: '⚔️',  label: '3. Hostile Neighbors' },
    { key: 'trade',         icon: '📦', label: '4. Trade / Supply Chain' },
    { key: 'response',      icon: '🏛️', label: '5. Society\'s Response' },
  ];

  const composite = diamond.composite || { level: 0, label: 'UNAVAILABLE', reasoning: '' };
  const compositeColor = levelColor(composite.level);

  const factorBars = factors.map(f => {
    const d = diamond[f.key];
    if (!d) return '';
    const color = levelColor(d.level);
    const pct = (d.level / 10) * 100;
    return `
      <div style="margin-bottom:0.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.15rem;">
          <span style="font-size:0.72rem;color:var(--text-dim);">${f.icon} ${f.label}</span>
          <span style="font-size:0.82rem;font-weight:700;color:${color};font-variant-numeric:tabular-nums;">${d.level}/10</span>
        </div>
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width 0.3s;"></div>
        </div>
        <div style="font-size:0.68rem;color:var(--text-dim);margin-top:0.15rem;line-height:1.3;">${esc(d.reasoning || '')}</div>
      </div>`;
  }).join('');

  return `
    <div style="margin-top:0.75rem;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:1rem;border-left:3px solid ${compositeColor};">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span style="font-size:0.7rem;color:var(--accent);text-transform:uppercase;letter-spacing:1px;">&#128214; Diamond Collapse Index</span>
          <span style="font-size:0.62rem;color:var(--text-dim);font-style:italic;">Jared Diamond's 5-Factor Framework</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:0.4rem;">
          <span style="font-size:1.3rem;font-weight:700;color:${compositeColor};line-height:1;">${composite.level}/10</span>
          <span class="badge ${levelBadgeClass(composite.level)}" style="font-size:0.6rem;">${composite.label}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem 1.5rem;">
        <div>${[factorBars[0], factorBars[1], factorBars[2]].join('')}</div>
        <div>${[factorBars[3], factorBars[4]].join('')}
          <div style="font-size:0.7rem;color:var(--text-dim);margin-top:0.5rem;padding-top:0.4rem;border-top:1px solid var(--border);line-height:1.35;">
            <strong style="color:var(--text);">Composite:</strong> ${esc(composite.reasoning || '')}
          </div>
        </div>
      </div>
    </div>`;
}

// ── Helpers ──

function levelColor(level) {
  if (level <= 3) return 'var(--green)';
  if (level <= 6) return 'var(--yellow)';
  if (level <= 8) return 'var(--red)';
  return '#ff7b72';
}

function levelBadgeClass(level) {
  if (level <= 3) return 'badge-low';
  if (level <= 6) return 'badge-medium';
  if (level <= 8) return 'badge-high';
  return 'badge-extreme';
}

function kpLevelColor(kp) {
  if (kp < 4) return 'var(--green)';
  if (kp < 6) return 'var(--yellow)';
  if (kp < 8) return 'var(--red)';
  return '#ff7b72';
}

function toneColor(tone) {
  if (tone < -5) return 'var(--red)';
  if (tone < -3) return 'var(--yellow)';
  if (tone > 3) return 'var(--green)';
  return 'var(--text-dim)';
}

function esc(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
