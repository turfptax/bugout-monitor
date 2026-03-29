import { useMemo } from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { EQUIPMENT_CATEGORIES } from '../../types/equipment';

// ── Critical items a prepper should own ──

const CRITICAL_ITEMS: { label: string; keywords: string[] }[] = [
  { label: 'Water filter', keywords: ['water filter', 'lifestraw', 'purification'] },
  { label: 'Radio', keywords: ['radio', 'uv-5r', 'baofeng'] },
  { label: 'First aid kit', keywords: ['first aid', 'ifak', 'medical kit'] },
  { label: 'Meshtastic / LoRa', keywords: ['meshtastic', 'lora'] },
  { label: 'Fire starter', keywords: ['fire starter', 'lighter', 'ferro rod'] },
  { label: 'Knife / multi-tool', keywords: ['knife', 'multi-tool', 'multitool'] },
  { label: 'Flashlight / headlamp', keywords: ['flashlight', 'headlamp'] },
  { label: 'Maps / compass', keywords: ['map', 'compass'] },
];

// ── localStorage read helper ──

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

// ── Score calculation ──

interface Factor {
  label: string;
  score: number; // 0-100
  weight: number;
  detail: string;
}

function computeFactors(
  itemNames: string[],
  itemCategories: Set<string>,
  aiProvider: string,
): Factor[] {
  // 1. Equipment completeness (30%)
  const catCount = EQUIPMENT_CATEGORIES.filter((c) => itemCategories.has(c)).length;
  const catTotal = EQUIPMENT_CATEGORIES.length;
  const equipScore = Math.round((catCount / catTotal) * 100);

  // 2. Critical items (25%)
  const critOwned = CRITICAL_ITEMS.filter((ci) =>
    ci.keywords.some((kw) => itemNames.some((n) => n.includes(kw)))
  ).length;
  const critScore = Math.round((critOwned / CRITICAL_ITEMS.length) * 100);

  // 3. Plan completeness (20%)
  const rally = readLS('bugout-rally', { primary: '', secondary: '', outOfArea: '' });
  const comms = readLS('bugout-comms', { primaryFrequency: '', meshtasticChannel: '' });
  const routes = readLS<Record<string, unknown>>('bugout-routes', {});
  let planParts = 0;
  const planTotal = 5;
  if (rally.primary) planParts++;
  if (rally.secondary) planParts++;
  if (comms.primaryFrequency) planParts++;
  if (comms.meshtasticChannel) planParts++;
  if (Object.keys(routes).length > 0) planParts++;
  const planScore = Math.round((planParts / planTotal) * 100);

  // 4. AI configured (5%)
  const aiScore = aiProvider !== 'none' ? 100 : 0;

  // 5. Threat monitoring (10%)
  const lastScan = localStorage.getItem('bugout-threat-data');
  const scanScore = lastScan ? 100 : 0;

  // 6. Backup exists (10%)
  const backupTs = localStorage.getItem('bugout-last-backup');
  const backupScore = backupTs ? 100 : 0;

  return [
    { label: 'Equipment Coverage', score: equipScore, weight: 0.30, detail: `${catCount}/${catTotal} categories` },
    { label: 'Critical Items', score: critScore, weight: 0.25, detail: `${critOwned}/${CRITICAL_ITEMS.length} owned` },
    { label: 'Plan Completeness', score: planScore, weight: 0.20, detail: `${planParts}/${planTotal} configured` },
    { label: 'AI Provider', score: aiScore, weight: 0.05, detail: aiProvider !== 'none' ? 'Configured' : 'Not set' },
    { label: 'Threat Monitoring', score: scanScore, weight: 0.10, detail: scanScore ? 'Scan data available' : 'No scans yet' },
    { label: 'Backup', score: backupScore, weight: 0.10, detail: backupScore ? 'Backup created' : 'No backup' },
  ];
}

function getAdvice(factors: Factor[]): string {
  const weakest = [...factors].sort((a, b) => a.score - b.score);
  const tips: string[] = [];
  for (const f of weakest) {
    if (f.score >= 80) continue;
    if (f.label === 'Equipment Coverage') tips.push('fill more equipment categories');
    else if (f.label === 'Critical Items') tips.push('acquire critical items (radio, water filter, first aid)');
    else if (f.label === 'Plan Completeness') tips.push('set rally points and comms frequencies');
    else if (f.label === 'AI Provider') tips.push('configure an AI provider for live threat analysis');
    else if (f.label === 'Threat Monitoring') tips.push('run a threat scan');
    else if (f.label === 'Backup') tips.push('export a backup of your data');
    if (tips.length >= 2) break;
  }
  if (tips.length === 0) return 'Excellent readiness. Keep gear rotated and plans updated.';
  return `Focus on: ${tips.join(' and ')}.`;
}

// ── SVG ring component ──

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <svg width="140" height="140" viewBox="0 0 120 120" className="block">
      {/* Background ring */}
      <circle
        cx="60" cy="60" r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className="text-border"
      />
      {/* Progress ring */}
      <circle
        cx="60" cy="60" r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      {/* Center text */}
      <text x="60" y="55" textAnchor="middle" className="fill-text-primary text-[1.8rem] font-bold" style={{ fontSize: '1.8rem' }}>
        {pct}%
      </text>
      <text x="60" y="72" textAnchor="middle" className="fill-text-dim text-[0.55rem]" style={{ fontSize: '0.55rem' }}>
        READINESS
      </text>
    </svg>
  );
}

export default function ReadinessScore() {
  const items = useEquipmentStore((s) => s.items);
  const aiProvider = useSettingsStore((s) => s.aiProvider);

  const { factors, overall } = useMemo(() => {
    const ownedItems = items.filter((i) => i.status === 'have');
    const names = ownedItems.map((i) => i.name.toLowerCase());
    const cats = new Set(ownedItems.map((i) => i.category));
    const factors = computeFactors(names, cats, aiProvider);
    const overall = Math.round(factors.reduce((acc, f) => acc + f.score * f.weight, 0));
    return { factors, overall };
  }, [items, aiProvider]);

  const ringColor =
    overall >= 70 ? 'var(--color-threat-green)' :
    overall >= 40 ? 'var(--color-threat-yellow)' :
    'var(--color-threat-red)';

  const textColor =
    overall >= 70 ? 'text-threat-green' :
    overall >= 40 ? 'text-threat-yellow' :
    'text-threat-red';

  return (
    <div className="bg-surface border border-border rounded-md p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-accent mb-4">
        Readiness Score
      </h3>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Ring */}
        <div className="flex-shrink-0">
          <ProgressRing pct={overall} color={ringColor} />
        </div>

        {/* Breakdown */}
        <div className="flex-1 w-full">
          <div className="space-y-2">
            {factors.map((f) => {
              const barColor =
                f.score >= 70 ? 'bg-threat-green' :
                f.score >= 40 ? 'bg-threat-yellow' :
                'bg-threat-red';
              return (
                <div key={f.label}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-text-primary">{f.label} <span className="text-text-dim">({Math.round(f.weight * 100)}%)</span></span>
                    <span className="text-text-dim">{f.detail}</span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${f.score}%`, transition: 'width 0.6s ease-out' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className={`text-xs mt-3 ${textColor}`}>
            {getAdvice(factors)}
          </p>
        </div>
      </div>
    </div>
  );
}
