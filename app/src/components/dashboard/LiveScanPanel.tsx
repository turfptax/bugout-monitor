import { useState } from 'react';
import { runLiveScan, type ScanProgress, type ScanResult } from '../../lib/liveScan';
import { useThreatStore } from '../../store/useThreatStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import type { SourceData } from '../../types/threat';

/**
 * Map live scan sourceData keys to the format the OSINT panel expects.
 * Scan uses: swpcKp, swpcAlerts, donki, nwsAlerts, gdelt
 * OSINT expects: solarData, swpcAlertsData, donkiData, weatherData, gdeltData, etc.
 */
function mapScanSourceData(raw: Record<string, unknown>): SourceData {
  const swpcKp = raw.swpcKp as Record<string, unknown> | undefined;
  const swpcAlerts = raw.swpcAlerts as Record<string, unknown> | undefined;
  const donki = raw.donki as Record<string, unknown> | undefined;
  const nwsAlerts = raw.nwsAlerts as Record<string, unknown> | undefined;
  const gdelt = raw.gdelt as Record<string, unknown> | undefined;

  // Derive a Kp description from the storm level
  const kpDescription = swpcKp
    ? (swpcKp.stormLevel as string) === 'Quiet'
      ? 'Quiet conditions'
      : `Geomagnetic activity: ${swpcKp.stormLevel as string}`
    : '';

  // GDELT live scan returns flat fields: { nuclearArticles, militaryArticles, unrestArticles, avgTone }
  // The OSINT panel expects nested: { nuclear: { articleCount }, military: { articleCount }, ... }
  const nuclearArticles = (gdelt?.nuclearArticles as number) ?? 0;
  const militaryArticles = (gdelt?.militaryArticles as number) ?? 0;
  const unrestArticles = (gdelt?.unrestArticles as number) ?? 0;
  const avgTone = (gdelt?.avgTone as number) ?? 0;

  // Count severe/extreme alerts for statewide count
  const alertsList = (nwsAlerts?.alerts as Array<{ event: string; severity: string; headline: string }>) ?? [];
  const statewideSevereCount = alertsList.filter(
    (a) => a.severity === 'Severe' || a.severity === 'Extreme'
  ).length;

  return {
    solarData: swpcKp ? {
      status: 'OK',
      currentKp: (swpcKp.currentKp as number) ?? 0,
      maxKp24h: (swpcKp.maxKp24h as number) ?? 0,
      kpDescription,
      stormLevel: (swpcKp.stormLevel as string) ?? 'Unknown',
    } : undefined,
    swpcAlertsData: swpcAlerts ? {
      status: 'OK',
      alertCount: (swpcAlerts.alertCount as number) ?? 0,
      highestGeomagScale: (swpcAlerts.highestGeomagScale as number) ?? 0,
      highestRadioBlackout: (swpcAlerts.highestRadioBlackout as number) ?? 0,
      hasWarning: (swpcAlerts.hasWarning as boolean) ?? false,
      hasWatch: (swpcAlerts.hasWatch as boolean) ?? false,
      forecast: swpcAlerts.forecast as { mFlareProb: number; xFlareProb: number } | undefined,
    } : undefined,
    donkiData: donki ? {
      status: 'OK',
      cmeCount: (donki.cmeCount as number) ?? 0,
      flareCount: (donki.flareCount as number) ?? 0,
      stormCount: (donki.stormCount as number) ?? 0,
      hasEarthDirectedCME: (donki.hasEarthDirectedCME as boolean) ?? false,
      hasXFlare: (donki.hasXFlare as boolean) ?? false,
      maxStormKp: (donki.maxStormKp as number) ?? 0,
    } : undefined,
    weatherData: nwsAlerts ? {
      status: 'OK',
      count: (nwsAlerts.count as number) ?? 0,
      highestSeverity: (nwsAlerts.highestSeverity as string) ?? 'None',
      statewideSevereCount,
      hasTornadoWarning: (nwsAlerts.hasTornadoWarning as boolean) ?? false,
      hasTornadoWatch: (nwsAlerts.hasTornadoWatch as boolean) ?? false,
      alerts: alertsList,
    } : undefined,
    nuclearData: {
      status: 'OK',
      headlineCount: 0,
      doomsdayClock: { value: '89 seconds to midnight', lastUpdated: 'January 2025' },
      headlines: [],
    },
    gdeltData: gdelt ? {
      status: 'OK',
      totalArticleCount: nuclearArticles + militaryArticles + unrestArticles,
      nuclear: { articleCount: nuclearArticles },
      military: { articleCount: militaryArticles },
      unrest: { articleCount: unrestArticles },
      avgNuclearMilitaryTone: avgTone,
      topArticles: [],
    } : undefined,
  };
}

export default function LiveScanPanel() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const aiProvider = useSettingsStore((s) => s.aiProvider);

  const handleScan = async () => {
    setScanning(true);
    setProgress(null);
    setLastResult(null);

    try {
      const result = await runLiveScan((p) => setProgress(p));
      setLastResult(result);

      // Update the threat store with the new data
      useThreatStore.setState({
        data: {
          assessment: result.assessment,
          sourceData: mapScanSourceData(result.sourceData),
          timestamp: result.timestamp,
          meta: result.meta,
        },
        lastFetched: Date.now(),
      });

      // Also save to localStorage for persistence
      try {
        const saveData = {
          assessment: result.assessment,
          sourceData: mapScanSourceData(result.sourceData),
          timestamp: result.timestamp,
          meta: result.meta,
        };
        localStorage.setItem('bugout-threat-data', JSON.stringify(saveData));
      } catch { /* localStorage might be full */ }

    } catch (err) {
      setProgress({
        phase: 'Error',
        sources: progress?.sources || [],
        complete: true,
        error: err instanceof Error ? err.message : 'Scan failed',
      });
    } finally {
      setScanning(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <span className="text-text-dim">○</span>;
      case 'fetching': return <span className="text-accent animate-pulse">◉</span>;
      case 'ok': return <span className="text-threat-green">✓</span>;
      case 'error': return <span className="text-threat-red">✕</span>;
      default: return <span>?</span>;
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      {/* Scan Button */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm">📡</span>
          <h3 className="text-xs font-semibold text-accent uppercase tracking-wider m-0">Live Threat Scan</h3>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className={`px-4 py-1.5 rounded text-xs font-bold cursor-pointer transition-all duration-200 flex items-center gap-2
            ${scanning
              ? 'bg-accent/20 text-accent border border-accent/40 cursor-wait'
              : 'bg-accent text-bg hover:opacity-90'
            }`}
        >
          {scanning ? (
            <>
              <span className="animate-spin">⟳</span>
              Scanning...
            </>
          ) : (
            <>
              <span>⚡</span>
              Scan Now
            </>
          )}
        </button>
      </div>

      {/* Progress */}
      {progress && (
        <div className="px-4 py-3">
          <div className="text-xs text-text-dim mb-2 flex items-center gap-2">
            {!progress.complete && <span className="animate-pulse">●</span>}
            {progress.phase}
          </div>

          {/* Source status grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-3">
            {progress.sources.map((src) => (
              <div
                key={src.name}
                className={`text-[11px] px-2 py-1.5 rounded border ${
                  src.status === 'ok' ? 'border-threat-green/30 bg-threat-green/5' :
                  src.status === 'error' ? 'border-threat-red/30 bg-threat-red/5' :
                  src.status === 'fetching' ? 'border-accent/30 bg-accent/5' :
                  'border-border bg-surface-2'
                }`}
              >
                <div className="flex items-center gap-1">
                  {statusIcon(src.status)}
                  <span className="text-text-dim truncate">{src.name.replace('NOAA ', '').replace('NASA ', '')}</span>
                </div>
                {src.error && <div className="text-threat-red text-[9px] mt-0.5 truncate">{src.error}</div>}
              </div>
            ))}
          </div>

          {/* Result summary */}
          {progress.complete && lastResult && (
            <div className="bg-surface-2 rounded p-3 border border-border text-xs">
              <div className="flex items-center gap-2 text-threat-green font-semibold mb-1">
                ✓ Scan complete — {lastResult.meta.sourceCount} sources, analyzed by {lastResult.meta.source === 'llm' ? `AI (${lastResult.meta.model})` : 'rule-based fallback'}
              </div>
              <div className="text-text-dim">
                Dashboard updated with fresh threat data. {aiProvider === 'none' && '(Connect an AI provider in Settings for deeper analysis)'}
              </div>
            </div>
          )}

          {/* Error */}
          {progress.error && (
            <div className="bg-threat-red/10 border border-threat-red/30 rounded p-3 text-xs text-threat-red">
              {progress.error}
            </div>
          )}
        </div>
      )}

      {/* No AI warning */}
      {!scanning && !progress && aiProvider === 'none' && (
        <div className="px-4 py-2 text-[11px] text-text-dim bg-surface-2 border-t border-border">
          ⚠️ No AI configured — scan will use rule-based analysis. <a href="#/settings" className="text-accent hover:underline">Add OpenRouter or LM Studio</a> for AI-powered threat assessment.
        </div>
      )}
    </div>
  );
}
