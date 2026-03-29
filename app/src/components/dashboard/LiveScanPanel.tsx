import { useState } from 'react';
import { runLiveScan, type ScanProgress, type ScanResult } from '../../lib/liveScan';
import { useThreatStore } from '../../store/useThreatStore';
import { useSettingsStore } from '../../store/useSettingsStore';

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
          sourceData: result.sourceData as Record<string, Record<string, unknown>>,
          timestamp: result.timestamp,
          meta: result.meta,
        },
        lastFetched: Date.now(),
      });

      // Also save to public/threat-data.json for persistence
      try {
        const saveData = {
          assessment: result.assessment,
          sourceData: result.sourceData,
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
