import { useState } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function SetupWizard() {
  const [step, setStep] = useState(0);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const setLocation = useSettingsStore((s) => s.setLocation);
  const location = useSettingsStore((s) => s.location);
  const setApiKey = useSettingsStore((s) => s.setApiKey);

  const steps = ['Welcome', 'Location', 'API Keys', 'Done'];

  const handleSkip = () => {
    completeOnboarding();
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-lg max-w-lg w-full p-6 animate-fade-in">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i <= step
                    ? 'bg-accent text-bg'
                    : 'bg-surface-2 text-text-dim border border-border'
                }`}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-accent' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 0 && (
          <div className="text-center">
            <div className="text-4xl mb-4">&#128737;&#65039;</div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Welcome to Bugout Monitor</h2>
            <p className="text-sm text-text-dim leading-relaxed mb-4">
              Your personal disaster preparedness dashboard. Track threats, manage equipment, and plan your emergency response.
            </p>
            <p className="text-xs text-text-dim">
              Let's set up a few things to get you started.
            </p>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Set Your Location</h2>
            <p className="text-sm text-text-dim mb-4">
              This helps provide localized weather alerts and threat assessments.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.68rem] text-text-dim uppercase tracking-wider mb-1">City</label>
                <input
                  type="text"
                  value={location.city}
                  onChange={(e) => setLocation({ city: e.target.value })}
                  placeholder="e.g. Lincoln"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-[0.68rem] text-text-dim uppercase tracking-wider mb-1">State</label>
                <input
                  type="text"
                  value={location.state}
                  onChange={(e) => setLocation({ state: e.target.value })}
                  placeholder="e.g. NE"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">API Keys (Optional)</h2>
            <p className="text-sm text-text-dim mb-4">
              Most data sources work without API keys. You can configure these later in Settings.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[0.68rem] text-text-dim uppercase tracking-wider mb-1">NWS API (free, no key needed)</label>
                <input
                  type="text"
                  onChange={(e) => setApiKey('nws', e.target.value)}
                  placeholder="Optional: User-Agent string"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-[0.68rem] text-text-dim uppercase tracking-wider mb-1">GDELT API Key</label>
                <input
                  type="password"
                  onChange={(e) => setApiKey('gdelt', e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="text-4xl mb-4">&#9989;</div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">You're All Set!</h2>
            <p className="text-sm text-text-dim leading-relaxed">
              Your dashboard is ready. Threat data will update automatically. You can adjust settings anytime from the Settings tab.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <button
            onClick={handleSkip}
            className="text-xs text-text-dim hover:text-text-primary cursor-pointer bg-transparent border-none"
          >
            Skip setup
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-1.5 border border-border rounded text-sm cursor-pointer hover:border-accent transition-colors bg-transparent text-text-primary"
              >
                Previous
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-1.5 bg-accent text-bg rounded text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
              >
                Next
              </button>
            ) : (
              <button
                onClick={completeOnboarding}
                className="px-4 py-1.5 bg-accent text-bg rounded text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
