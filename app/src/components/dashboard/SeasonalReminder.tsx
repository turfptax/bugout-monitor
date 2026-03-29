import { useState } from 'react';

interface SeasonInfo {
  name: string;
  icon: string;
  advice: string;
}

function getSeason(month: number): SeasonInfo {
  // month is 0-indexed (0=Jan, 11=Dec)
  if (month >= 2 && month <= 4) {
    return {
      name: 'Spring',
      icon: '\uD83C\uDF2A\uFE0F',
      advice: 'Tornado season peak. Check shelter supplies and weather radio batteries. Rotate winter gear out, add rain ponchos and tarps.',
    };
  }
  if (month >= 5 && month <= 7) {
    return {
      name: 'Summer',
      icon: '\u2600\uFE0F',
      advice: 'Heat risk. Add extra water capacity and electrolyte packets. Check battery expiration dates on power banks and flashlights.',
    };
  }
  if (month >= 8 && month <= 10) {
    return {
      name: 'Fall',
      icon: '\uD83C\uDF42',
      advice: 'Winter prep season. Add cold weather layers, thermal blankets, and hand warmers. Stock fuel for stoves and verify heating backup.',
    };
  }
  // Winter: Dec (11), Jan (0), Feb (1)
  return {
    name: 'Winter',
    icon: '\u2744\uFE0F',
    advice: 'Cold exposure risk. Verify heating backup and insulation supplies. Check antifreeze in vehicles. Stock hand warmers and extra sleeping bags.',
  };
}

export default function SeasonalReminder() {
  const [dismissed, setDismissed] = useState(false);
  const season = getSeason(new Date().getMonth());

  if (dismissed) return null;

  return (
    <div className="bg-surface border border-border rounded-md p-4 relative">
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-text-dim hover:text-text-primary text-lg leading-none cursor-pointer bg-transparent border-none p-1"
        title="Dismiss"
      >
        \u00D7
      </button>

      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{season.icon}</span>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-1">
            {season.name} Advisory
          </h4>
          <p className="text-xs text-text-dim leading-relaxed m-0">
            {season.advice}
          </p>
        </div>
      </div>
    </div>
  );
}
