import { useSettingsStore } from '../../store/useSettingsStore';

const PROMPTS = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    getLabel: (city: string) => city ? `Help me write my threat assessment for ${city}` : 'Help me write my threat assessment',
    desc: 'Detailed analysis of local risks',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    getLabel: () => 'What equipment am I missing for a 72-hour bugout?',
    desc: 'Gap analysis for your gear list',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 11 22 2 13 21 11 13 3 11" />
      </svg>
    ),
    getLabel: () => 'Analyze my bugout routes \u2014 what should I consider?',
    desc: 'Route planning guidance',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
    getLabel: () => 'Explain the current solar threat level',
    desc: 'Solar/EMP risk breakdown',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    getLabel: () => 'What should my shelter-in-place plan include?',
    desc: 'Shelter-in-place checklist',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    getLabel: () => 'Help me set up rally points',
    desc: 'Team coordination planning',
  },
];

export default function SuggestedPrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  const city = useSettingsStore((s) => s.location.city);

  return (
    <div className="px-4 py-6">
      <div className="text-center mb-5">
        <div className="text-2xl mb-2">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="inline text-accent">
            <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
            <line x1="10" y1="22" x2="14" y2="22" />
          </svg>
        </div>
        <h3 className="text-text-primary font-semibold text-sm">AI Preparedness Advisor</h3>
        <p className="text-text-dim text-xs mt-1">
          Ask about threats, equipment, routes, or planning
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelect(prompt.getLabel(city))}
            className="flex items-start gap-3 p-3 rounded-lg bg-surface border border-border
              hover:border-accent/50 hover:bg-surface-2 transition-all duration-150
              text-left cursor-pointer group"
          >
            <span className="text-accent mt-0.5 shrink-0 group-hover:scale-110 transition-transform">
              {prompt.icon}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-medium text-text-primary leading-snug">
                {prompt.getLabel(city)}
              </div>
              <div className="text-[10px] text-text-dim mt-0.5">{prompt.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
