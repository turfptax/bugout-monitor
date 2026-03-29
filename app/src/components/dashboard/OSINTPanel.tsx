import { useState } from 'react';
import HelpIcon from '../layout/HelpIcon';
import { kpLevelColor, toneColor } from '../../lib/threatLevels';
import type { SourceData } from '../../types/threat';

interface Props {
  sourceData: SourceData;
}

function OsintRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1 text-[0.8rem]">
      <span className="text-text-dim">{label}</span>
      <span className="font-semibold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}

function Meter({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1 bg-border rounded-full overflow-hidden mt-0.5">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function SolarCard({ sourceData }: Props) {
  const { solarData, donkiData, swpcAlertsData } = sourceData;
  if (solarData?.status === 'UNAVAILABLE') {
    return (
      <div className="bg-surface-2 border border-border rounded-md p-4">
        <h4 className="text-xs text-accent uppercase tracking-wider font-semibold pb-2 mb-3 border-b border-border">
          &#9728;&#65039; Solar / Space Weather Intel
        </h4>
        <div className="text-text-dim text-sm">Data unavailable</div>
      </div>
    );
  }

  const kpColor = kpLevelColor(solarData?.maxKp24h ?? 0);
  const kpPct = Math.min(100, ((solarData?.maxKp24h ?? 0) / 9) * 100);

  return (
    <div className="bg-surface-2 border border-border rounded-md p-4">
      <h4 className="text-xs text-accent uppercase tracking-wider font-semibold pb-2 mb-3 border-b border-border">
        &#9728;&#65039; Solar / Space Weather Intel
      </h4>
      <OsintRow label="Current Kp Index" value={String(solarData?.currentKp ?? '?')} color={kpColor} />
      <OsintRow label="24h Max Kp" value={String(solarData?.maxKp24h ?? '?')} color={kpColor} />
      <Meter pct={kpPct} color={kpColor} />
      {solarData?.kpDescription && <OsintRow label="Condition" value={solarData.kpDescription} />}
      {solarData?.stormLevel && <OsintRow label="Storm Level" value={solarData.stormLevel} />}

      {swpcAlertsData && swpcAlertsData.status !== 'UNAVAILABLE' && (
        <>
          <OsintRow
            label="SWPC Geomag Scale"
            value={`G${swpcAlertsData.highestGeomagScale ?? 0}${swpcAlertsData.hasWarning ? ' WARNING' : swpcAlertsData.hasWatch ? ' WATCH' : ''}`}
            color={(swpcAlertsData.highestGeomagScale ?? 0) >= 3 ? '#d29922' : undefined}
          />
          <OsintRow label="Radio Blackout" value={`R${swpcAlertsData.highestRadioBlackout ?? 0}`} />
          {swpcAlertsData.forecast && (
            <>
              <OsintRow label="M-flare prob (24h)" value={`${swpcAlertsData.forecast.mFlareProb}%`} />
              <OsintRow
                label="X-flare prob (24h)"
                value={`${swpcAlertsData.forecast.xFlareProb}%`}
                color={swpcAlertsData.forecast.xFlareProb > 10 ? '#d29922' : undefined}
              />
            </>
          )}
        </>
      )}

      {donkiData && donkiData.status !== 'UNAVAILABLE' && (
        <>
          <OsintRow
            label="CMEs (7d)"
            value={`${donkiData.cmeCount}${donkiData.hasEarthDirectedCME ? ' EARTH-DIRECTED' : ''}`}
            color={donkiData.hasEarthDirectedCME ? '#f85149' : undefined}
          />
          <OsintRow
            label="M/X Flares (7d)"
            value={`${donkiData.flareCount}${donkiData.hasXFlare ? ' (X-class!)' : ''}`}
            color={donkiData.hasXFlare ? '#f85149' : undefined}
          />
          <OsintRow
            label="Geomag Storms (7d)"
            value={`${donkiData.stormCount}${donkiData.maxStormKp > 0 ? ` (max Kp: ${donkiData.maxStormKp})` : ''}`}
          />
        </>
      )}
    </div>
  );
}

function NuclearCard({ sourceData }: Props) {
  const { nuclearData, gdeltData } = sourceData;
  if (nuclearData?.status === 'UNAVAILABLE') {
    return (
      <div className="bg-surface-2 border border-border rounded-md p-4">
        <h4 className="text-xs text-accent uppercase tracking-wider font-semibold pb-2 mb-3 border-b border-border">
          &#9762;&#65039; Nuclear / Geopolitical Intel
        </h4>
        <div className="text-text-dim text-sm">Data unavailable</div>
      </div>
    );
  }

  return (
    <div className="bg-surface-2 border border-border rounded-md p-4">
      <h4 className="text-xs text-accent uppercase tracking-wider font-semibold pb-2 mb-3 border-b border-border">
        &#9762;&#65039; Nuclear / Geopolitical Intel
      </h4>
      {nuclearData?.doomsdayClock && (
        <>
          <OsintRow label="Doomsday Clock" value={nuclearData.doomsdayClock.value} color="#d29922" />
          <OsintRow label="Clock Updated" value={nuclearData.doomsdayClock.lastUpdated} />
        </>
      )}
      <OsintRow label="RSS Headlines (48h)" value={String(nuclearData?.headlineCount ?? 0)} />

      {gdeltData && gdeltData.status !== 'UNAVAILABLE' && (
        <>
          <OsintRow label="GDELT Nuclear Articles" value={String(gdeltData.nuclear?.articleCount ?? 0)} />
          <OsintRow label="GDELT Military Articles" value={String(gdeltData.military?.articleCount ?? 0)} />
          <OsintRow
            label="Avg Tone (nuclear/mil)"
            value={String(gdeltData.avgNuclearMilitaryTone ?? 0)}
            color={toneColor(gdeltData.avgNuclearMilitaryTone ?? 0)}
          />
        </>
      )}

      {nuclearData?.headlines && nuclearData.headlines.length > 0 && (
        <div className="mt-3 pt-2 border-t border-border">
          <div className="text-[0.68rem] text-text-dim uppercase tracking-wide mb-1">
            Recent Headlines
          </div>
          {nuclearData.headlines.slice(0, 6).map((h, i) => (
            <div key={i} className="py-1 text-[0.78rem] text-text-dim border-b border-border/50 last:border-b-0 leading-snug">
              <span className="text-accent-2 text-[0.68rem] font-semibold uppercase mr-1.5">
                {h.source}
              </span>
              {h.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeatherCard({ sourceData }: Props) {
  const { weatherData } = sourceData;
  if (weatherData?.status === 'UNAVAILABLE') {
    return (
      <div className="bg-surface-2 border border-border rounded-md p-4">
        <h4 className="text-xs text-accent uppercase tracking-wider font-semibold pb-2 mb-3 border-b border-border">
          &#127786;&#65039; Weather / Tornado Intel
        </h4>
        <div className="text-text-dim text-sm">Data unavailable</div>
      </div>
    );
  }

  return (
    <div className="bg-surface-2 border border-border rounded-md p-4">
      <h4 className="text-xs text-accent uppercase tracking-wider font-semibold pb-2 mb-3 border-b border-border">
        &#127786;&#65039; Weather / Tornado Intel
      </h4>
      <div className="flex justify-between items-center py-1 text-[0.8rem]">
        <span className="text-text-dim">County Alerts</span>
        <span className="font-semibold flex items-center gap-2">
          {weatherData?.count ?? 0}
          {weatherData?.hasTornadoWarning && (
            <span className="text-[0.7rem] font-bold text-threat-red bg-threat-red/20 border border-threat-red/40 px-1.5 py-0.5 rounded">
              TORNADO WARNING
            </span>
          )}
          {weatherData?.hasTornadoWatch && !weatherData?.hasTornadoWarning && (
            <span className="text-[0.7rem] font-bold text-threat-yellow bg-threat-yellow/20 border border-threat-yellow/40 px-1.5 py-0.5 rounded">
              TORNADO WATCH
            </span>
          )}
        </span>
      </div>
      <OsintRow label="Highest Severity" value={weatherData?.highestSeverity || 'None'} />
      <OsintRow label="Statewide Severe/Extreme" value={String(weatherData?.statewideSevereCount ?? 0)} />

      {weatherData?.alerts && weatherData.alerts.length > 0 && (
        <div className="mt-3 pt-2 border-t border-border">
          <div className="text-[0.68rem] text-text-dim uppercase tracking-wide mb-1">
            Active Alerts
          </div>
          {weatherData.alerts.slice(0, 5).map((a, i) => {
            const sevColor = a.severity === 'Extreme' || a.severity === 'Severe'
              ? '#f85149' : a.severity === 'Moderate' ? '#d29922' : '#8b949e';
            return (
              <div key={i} className="py-1 text-[0.78rem] text-text-dim border-b border-border/50 last:border-b-0 leading-snug">
                <span className="font-semibold text-[0.72rem]" style={{ color: sevColor }}>
                  {a.event}
                </span>
                {a.headline && ` \u2014 ${a.headline}`}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GDELTCard({ sourceData }: Props) {
  const { gdeltData } = sourceData;
  if (gdeltData?.status === 'UNAVAILABLE') {
    return (
      <div className="bg-surface-2 border border-border rounded-md p-4">
        <h4 className="text-xs text-accent uppercase tracking-wider font-semibold pb-2 mb-3 border-b border-border">
          &#127760; GDELT Global News Monitor
        </h4>
        <div className="text-text-dim text-sm">Data unavailable</div>
      </div>
    );
  }

  const nuclearCount = gdeltData?.nuclear?.articleCount ?? 0;
  const militaryCount = gdeltData?.military?.articleCount ?? 0;
  const unrestCount = gdeltData?.unrest?.articleCount ?? 0;
  const maxCount = Math.max(nuclearCount, militaryCount, unrestCount, 1);

  return (
    <div className="bg-surface-2 border border-border rounded-md p-4">
      <h4 className="text-xs text-accent uppercase tracking-wider font-semibold pb-2 mb-3 border-b border-border">
        &#127760; GDELT Global News Monitor (7d)
      </h4>
      <OsintRow label="Nuclear Threat" value={`${nuclearCount} articles`} />
      <Meter pct={(nuclearCount / maxCount) * 100} color="#f85149" />
      <OsintRow label="Military Escalation" value={`${militaryCount} articles`} />
      <Meter pct={(militaryCount / maxCount) * 100} color="#d29922" />
      <OsintRow label="US Civil Unrest" value={`${unrestCount} articles`} />
      <Meter pct={(unrestCount / maxCount) * 100} color="#58a6ff" />

      <div className="flex justify-between items-center py-1 text-[0.8rem] mt-2">
        <span className="text-text-dim">Combined Tone</span>
        <span className="font-semibold" style={{ color: toneColor(gdeltData?.avgNuclearMilitaryTone ?? 0) }}>
          {gdeltData?.avgNuclearMilitaryTone ?? 0}
          <span className="text-[0.68rem] font-normal text-text-dim ml-1">(neg = concerning)</span>
        </span>
      </div>

      {gdeltData?.topArticles && gdeltData.topArticles.length > 0 && (
        <div className="mt-3 pt-2 border-t border-border">
          <div className="text-[0.68rem] text-text-dim uppercase tracking-wide mb-1">
            Top Articles (7d)
          </div>
          {gdeltData.topArticles.slice(0, 8).map((a, i) => (
            <div key={i} className="py-1 text-[0.78rem] text-text-dim border-b border-border/50 last:border-b-0 leading-snug">
              <span className="text-accent-2 text-[0.68rem] font-semibold uppercase mr-1.5">
                {a.queryCategory || ''}
              </span>
              {a.title || 'Untitled'}
              <span className="text-[0.68rem] ml-1" style={{ color: toneColor(a.tone ?? 0) }}>
                ({a.tone > 0 ? '+' : ''}{a.tone})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OSINTPanel({ sourceData }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const sources = [
    { name: 'NOAA SWPC Kp Index', ok: sourceData.solarData?.status !== 'UNAVAILABLE', detail: sourceData.solarData?.status !== 'UNAVAILABLE' ? `Kp ${sourceData.solarData?.currentKp} (24h max: ${sourceData.solarData?.maxKp24h})` : 'Unavailable' },
    { name: 'NOAA SWPC Alerts', ok: sourceData.swpcAlertsData?.status !== 'UNAVAILABLE', detail: sourceData.swpcAlertsData?.status !== 'UNAVAILABLE' ? `${sourceData.swpcAlertsData?.alertCount} alert(s)` : 'Unavailable' },
    { name: 'NASA DONKI', ok: sourceData.donkiData?.status !== 'UNAVAILABLE', detail: sourceData.donkiData?.status !== 'UNAVAILABLE' ? `${sourceData.donkiData?.cmeCount} CME, ${sourceData.donkiData?.flareCount} flare, ${sourceData.donkiData?.stormCount} storm` : 'Unavailable' },
    { name: 'NWS Weather Alerts', ok: sourceData.weatherData?.status !== 'UNAVAILABLE', detail: sourceData.weatherData?.status !== 'UNAVAILABLE' ? `${sourceData.weatherData?.count} alert(s)` : 'Unavailable' },
    { name: 'Arms Control RSS', ok: sourceData.nuclearData?.status !== 'UNAVAILABLE', detail: sourceData.nuclearData?.status !== 'UNAVAILABLE' ? `${sourceData.nuclearData?.headlines?.length ?? 0} headline(s)` : 'Unavailable' },
    { name: 'GDELT Global News', ok: sourceData.gdeltData?.status !== 'UNAVAILABLE', detail: sourceData.gdeltData?.status !== 'UNAVAILABLE' ? `${sourceData.gdeltData?.totalArticleCount ?? 0} article(s)` : 'Unavailable' },
    { name: 'US Drought Monitor', ok: sourceData.droughtData?.status !== 'UNAVAILABLE', detail: sourceData.droughtData?.status !== 'UNAVAILABLE' ? `${sourceData.droughtData?.highestCategory}, severity ${sourceData.droughtData?.severityScore}/100` : 'Unavailable' },
    { name: 'FRED Economic Data', ok: sourceData.economicData?.status !== 'UNAVAILABLE', detail: sourceData.economicData?.status !== 'UNAVAILABLE' ? `Stress ${sourceData.economicData?.stressScore}/100` : 'Unavailable' },
  ];

  const sourcesOnline = sources.filter((s) => s.ok).length;

  return (
    <div className="bg-surface border-b border-border px-4 md:px-8 pb-4">
      <div className="max-w-[1400px] mx-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full cursor-pointer select-none flex items-center justify-between py-3 bg-transparent border-none"
        >
          <h3 className="text-[0.8rem] text-accent-2 uppercase tracking-widest font-semibold m-0 p-0 flex items-center gap-2">
            &#128225; OSINT Intelligence Feed &mdash; {sourcesOnline}/{sources.length} sources online
            <HelpIcon helpKey="osint-panel" />
          </h3>
          <span
            className="text-text-dim text-xs transition-transform duration-200"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            &#9660;
          </span>
        </button>

        {isOpen && (
          <div className="animate-fade-in pb-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <SolarCard sourceData={sourceData} />
              <NuclearCard sourceData={sourceData} />
              <WeatherCard sourceData={sourceData} />
              <GDELTCard sourceData={sourceData} />
            </div>

            <div className="bg-surface-2 border border-border rounded-md p-4 mt-4">
              <h4 className="text-xs text-accent uppercase tracking-wider font-semibold pb-2 mb-3 border-b border-border">
                &#128752; Source Status
              </h4>
              {sources.map((s, i) => (
                <div key={i} className="flex items-center gap-2 py-1 text-[0.78rem]">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${s.ok ? 'bg-threat-green' : 'bg-threat-red'}`}
                  />
                  <span className="text-text-primary flex-1">{s.name}</span>
                  <span className="text-text-dim text-[0.72rem]">{s.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
