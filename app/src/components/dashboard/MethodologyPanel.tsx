import { useState } from 'react';

export default function MethodologyPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-surface border-t border-border">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full py-3 flex items-center justify-between cursor-pointer bg-transparent border-none text-left"
        >
          <span className="text-xs font-semibold text-text-dim uppercase tracking-wider flex items-center gap-2">
            📐 Methodology & Data Sources
          </span>
          <span className={`text-text-dim text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {isOpen && (
          <div className="pb-6 animate-fade-in">
            {/* Overview */}
            <div className="bg-surface-2 border border-border rounded-lg p-4 mb-4">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">How Threat Levels Are Calculated</h4>
              <p className="text-xs text-text-dim leading-relaxed mb-3">
                The Bugout Monitor aggregates data from multiple government and open-source intelligence (OSINT) APIs, then uses an AI language model to synthesize the data into calibrated threat levels (1-10). When AI is unavailable, a deterministic rule-based fallback ensures continuous monitoring.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                <div className="bg-surface rounded p-3 border border-border">
                  <div className="font-bold text-threat-green mb-1">1-3 Low / Minimal</div>
                  <div className="text-text-dim">Normal conditions. Continue monitoring. Maintain readiness.</div>
                </div>
                <div className="bg-surface rounded p-3 border border-border">
                  <div className="font-bold text-threat-yellow mb-1">4-6 Elevated</div>
                  <div className="text-text-dim">Increased risk. Alert family, top off supplies, fuel, cash.</div>
                </div>
                <div className="bg-surface rounded p-3 border border-border">
                  <div className="font-bold text-threat-red mb-1">7-10 High / Extreme</div>
                  <div className="text-text-dim">Significant danger. Stage at rally point. Prepare to execute bugout.</div>
                </div>
              </div>
            </div>

            {/* Data Sources */}
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Data Sources</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {[
                {
                  icon: '☀️', name: 'NOAA SWPC', category: 'Solar / EMP',
                  desc: 'Real-time planetary Kp index (geomagnetic storm indicator) and space weather alerts from the Space Weather Prediction Center.',
                  url: 'https://services.swpc.noaa.gov',
                  updates: 'Every 1 minute',
                },
                {
                  icon: '🛰️', name: 'NASA DONKI', category: 'Solar / EMP',
                  desc: 'Coronal Mass Ejection (CME), solar flare, and geomagnetic storm event data from the Space Weather Database.',
                  url: 'https://api.nasa.gov/DONKI',
                  updates: 'Near real-time',
                },
                {
                  icon: '🌪️', name: 'NWS Alerts API', category: 'Weather',
                  desc: 'Active watches, warnings, and advisories for Nebraska from the National Weather Service.',
                  url: 'https://api.weather.gov',
                  updates: 'Real-time',
                },
                {
                  icon: '☢️', name: 'Arms Control RSS', category: 'Nuclear',
                  desc: 'Nuclear policy headlines from Arms Control Association and IAEA news feeds.',
                  url: 'https://armscontrol.org',
                  updates: 'Daily',
                },
                {
                  icon: '🌐', name: 'GDELT Project', category: 'Geopolitical',
                  desc: 'Global news monitoring — article counts and tone analysis for nuclear, military, and civil unrest keywords across 100+ languages.',
                  url: 'https://api.gdeltproject.org',
                  updates: 'Every 15 minutes',
                },
                {
                  icon: '🤖', name: 'AI Analysis', category: 'Synthesis',
                  desc: 'All source data is fed to a language model (OpenRouter or LM Studio) that produces calibrated threat levels with reasoning. Falls back to rule-based analysis if AI is unavailable.',
                  url: '',
                  updates: 'On each scan',
                },
              ].map((src) => (
                <div key={src.name} className="bg-surface-2 border border-border rounded p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{src.icon}</span>
                    <span className="text-xs font-semibold text-text-primary">{src.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface border border-border text-text-dim">{src.category}</span>
                  </div>
                  <p className="text-[11px] text-text-dim leading-relaxed mb-1">{src.desc}</p>
                  <div className="flex items-center gap-3 text-[10px] text-text-dim">
                    {src.url && <span>🔗 {src.url.replace('https://', '')}</span>}
                    <span>⏱️ {src.updates}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Diamond Framework */}
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Diamond Collapse Index</h4>
            <div className="bg-surface-2 border border-border rounded-lg p-4 mb-4">
              <p className="text-xs text-text-dim leading-relaxed mb-3">
                Based on Jared Diamond's five-factor framework from "Collapse: How Societies Choose to Fail or Succeed" (2005). The AI evaluates current conditions against each factor that historically contributed to societal collapse.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
                {[
                  { icon: '🌿', label: '1. Environmental', desc: 'Resource depletion, drought, pollution' },
                  { icon: '🌡️', label: '2. Climate', desc: 'Climate instability, extreme weather trends' },
                  { icon: '⚔️', label: '3. Hostile Neighbors', desc: 'Military threats, geopolitical tensions' },
                  { icon: '📦', label: '4. Trade Partners', desc: 'Supply chain disruption, trade collapse' },
                  { icon: '🏛️', label: '5. Society Response', desc: 'Institutional capacity, social cohesion' },
                ].map((f) => (
                  <div key={f.label} className="bg-surface rounded p-2 border border-border">
                    <div className="font-semibold text-text-primary mb-0.5">{f.icon} {f.label}</div>
                    <div className="text-text-dim">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calibration */}
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Calibration Notes</h4>
            <div className="bg-surface-2 border border-border rounded-lg p-4 text-[11px] text-text-dim leading-relaxed">
              <ul className="list-disc pl-4 space-y-1.5">
                <li><strong className="text-text-primary">Nuclear baseline ≥ 4/10:</strong> The Doomsday Clock is at 89 seconds to midnight (closest in history). Active land war in Europe between nuclear-armed parties. Nuclear rhetoric at post-Cold War highs. These structural factors set a floor.</li>
                <li><strong className="text-text-primary">Solar scales with Kp:</strong> Kp 0-3 = Low (1-3), Kp 4-5 = Elevated (4-6), Kp 6-7 = High (7-8), Kp 8-9 = Extreme (9-10). Earth-directed CMEs automatically escalate.</li>
                <li><strong className="text-text-primary">Weather uses NWS severity:</strong> Alert count and maximum severity level. Tornado warnings automatically escalate to 7+.</li>
                <li><strong className="text-text-primary">GDELT tone analysis:</strong> Negative tone values (below -3) in nuclear/military coverage correlate with heightened tensions. Used as a supplementary signal.</li>
                <li><strong className="text-text-primary">Overall = max(individual) with AI judgment:</strong> The AI considers interactions between threats (e.g., grid failure during a nuclear crisis compounds both).</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
