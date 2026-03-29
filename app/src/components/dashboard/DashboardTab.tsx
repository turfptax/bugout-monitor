import { useEffect } from 'react';
import { useThreatStore } from '../../store/useThreatStore';
import ThreatHero from './ThreatHero';
import ThreatCardGrid from './ThreatCardGrid';
import DiamondIndex from './DiamondIndex';
import OSINTPanel from './OSINTPanel';
import LiveScanPanel from './LiveScanPanel';
import MethodologyPanel from './MethodologyPanel';

export default function DashboardTab() {
  const { data, loading, error, fetchData } = useThreatStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">&#128737;&#65039;</div>
          <div className="text-text-dim text-sm">Loading threat intelligence...</div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">&#9888;&#65039;</div>
          <div className="text-threat-red text-sm font-semibold mb-2">Failed to load threat data</div>
          <div className="text-text-dim text-xs mb-4">{error}</div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-accent text-bg rounded text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { assessment, sourceData, timestamp, meta } = data;

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

  return (
    <div>
      <div className="bg-surface border-b-2 border-border px-4 md:px-8 py-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm text-accent uppercase tracking-widest font-semibold m-0 p-0">
              &#128737;&#65039; Threat Monitor
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-[0.7rem] text-text-dim px-2 py-0.5 bg-surface-2 rounded border border-border">
                {meta.source === 'llm' ? 'AI' : 'Rule-based'}
                {meta.model ? ` \u00B7 ${meta.model}` : ''}
                {` \u00B7 ${meta.sourceCount} sources`}
              </span>
              <span className="text-xs text-text-dim">Updated: {formatted}</span>
            </div>
          </div>

          <ThreatHero overall={assessment.overall} />
          <ThreatCardGrid assessment={assessment} />
          {assessment.diamond && <DiamondIndex diamond={assessment.diamond} />}
        </div>
      </div>

      {/* Live Scan */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4">
        <LiveScanPanel />
      </div>

      <OSINTPanel sourceData={sourceData} />

      {/* Methodology */}
      <MethodologyPanel />
    </div>
  );
}
