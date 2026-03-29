import { useState } from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';

// ── Scenario columns ──

const SCENARIOS = [
  { id: 'nuclear', label: 'Nuclear', icon: '\u2622' },
  { id: 'emp', label: 'EMP/Solar', icon: '\u26A1' },
  { id: 'tornado', label: 'Tornado', icon: '\uD83C\uDF2A\uFE0F' },
  { id: 'civil', label: 'Civil Unrest', icon: '\u2694\uFE0F' },
  { id: 'food', label: 'Food Shortage', icon: '\uD83C\uDF5A' },
  { id: 'power', label: 'Power Outage', icon: '\uD83D\uDD0B' },
] as const;

type ScenarioId = (typeof SCENARIOS)[number]['id'];
type Relevance = 'critical' | 'useful' | 'none';

interface GearRow {
  label: string;
  /** Keywords to match against user equipment names (case-insensitive) */
  keywords: string[];
  relevance: Record<ScenarioId, Relevance>;
}

const GEAR_MATRIX: GearRow[] = [
  {
    label: 'Geiger Counter',
    keywords: ['geiger', 'radiation', 'dosimeter'],
    relevance: { nuclear: 'critical', emp: 'useful', tornado: 'none', civil: 'none', food: 'none', power: 'none' },
  },
  {
    label: 'Faraday Bags',
    keywords: ['faraday'],
    relevance: { nuclear: 'useful', emp: 'critical', tornado: 'none', civil: 'none', food: 'none', power: 'none' },
  },
  {
    label: 'Solar Panel',
    keywords: ['solar panel', 'solar charger'],
    relevance: { nuclear: 'none', emp: 'critical', tornado: 'none', civil: 'none', food: 'useful', power: 'critical' },
  },
  {
    label: 'UV-5R Radio',
    keywords: ['uv-5r', 'baofeng', 'radio'],
    relevance: { nuclear: 'critical', emp: 'critical', tornado: 'critical', civil: 'critical', food: 'critical', power: 'critical' },
  },
  {
    label: 'Meshtastic',
    keywords: ['meshtastic', 'lora'],
    relevance: { nuclear: 'critical', emp: 'critical', tornado: 'critical', civil: 'critical', food: 'critical', power: 'critical' },
  },
  {
    label: 'Water Filter',
    keywords: ['water filter', 'lifestraw', 'purification'],
    relevance: { nuclear: 'critical', emp: 'critical', tornado: 'critical', civil: 'critical', food: 'critical', power: 'critical' },
  },
  {
    label: 'Food Rations',
    keywords: ['food', 'rice', 'meal', 'ration', 'bar', 'freeze-dried'],
    relevance: { nuclear: 'useful', emp: 'useful', tornado: 'useful', civil: 'useful', food: 'critical', power: 'useful' },
  },
  {
    label: 'First Aid Kit',
    keywords: ['first aid', 'ifak', 'medical kit'],
    relevance: { nuclear: 'critical', emp: 'critical', tornado: 'critical', civil: 'critical', food: 'critical', power: 'critical' },
  },
  {
    label: 'Cash',
    keywords: ['cash', 'money', 'currency'],
    relevance: { nuclear: 'none', emp: 'none', tornado: 'none', civil: 'critical', food: 'critical', power: 'useful' },
  },
  {
    label: 'Maps / Compass',
    keywords: ['map', 'compass', 'atlas'],
    relevance: { nuclear: 'critical', emp: 'critical', tornado: 'none', civil: 'useful', food: 'none', power: 'none' },
  },
  {
    label: 'Survival Tent',
    keywords: ['tent', 'shelter', 'tarp'],
    relevance: { nuclear: 'useful', emp: 'none', tornado: 'critical', civil: 'useful', food: 'none', power: 'none' },
  },
  {
    label: 'Rocket Stove',
    keywords: ['rocket stove', 'stove', 'cookware'],
    relevance: { nuclear: 'none', emp: 'none', tornado: 'none', civil: 'none', food: 'useful', power: 'critical' },
  },
];

const INDICATOR: Record<Relevance, { symbol: string; color: string; label: string }> = {
  critical: { symbol: '\uD83D\uDFE2', color: 'text-threat-green', label: 'Critical' },
  useful:   { symbol: '\uD83D\uDFE1', color: 'text-threat-yellow', label: 'Useful' },
  none:     { symbol: '\u2B1C',       color: 'text-text-dim',      label: 'N/A' },
};

function userHasGear(keywords: string[], itemNames: string[]): boolean {
  return keywords.some((kw) =>
    itemNames.some((name) => name.includes(kw))
  );
}

export default function GearMatrix() {
  const [open, setOpen] = useState(false);
  const items = useEquipmentStore((s) => s.items);
  const itemNames = items
    .filter((i) => i.status === 'have')
    .map((i) => i.name.toLowerCase());

  return (
    <div className="bg-surface border border-border rounded-md overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-2 border-b border-border cursor-pointer hover:bg-accent/5 transition-colors"
      >
        <h4 className="text-sm font-bold uppercase tracking-wider text-accent m-0">
          Cross-Scenario Gear Matrix
        </h4>
        <span className="text-text-dim text-xs select-none">{open ? '\u25B2 Collapse' : '\u25BC Expand'}</span>
      </button>

      {open && (
        <div className="overflow-x-auto">
          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border text-xs text-text-dim">
            <span>{INDICATOR.critical.symbol} Critical</span>
            <span>{INDICATOR.useful.symbol} Useful</span>
            <span>{INDICATOR.none.symbol} Not relevant</span>
            <span className="ml-auto text-threat-red">Red row = you don't own this item</span>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-xs text-text-dim uppercase tracking-wider font-semibold w-[160px] sticky left-0 bg-surface z-10">
                  Equipment
                </th>
                {SCENARIOS.map((s) => (
                  <th key={s.id} className="px-2 py-2 text-center text-xs text-text-dim uppercase tracking-wider font-semibold min-w-[90px]">
                    <span className="block text-base leading-none mb-0.5">{s.icon}</span>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GEAR_MATRIX.map((row) => {
                const owned = userHasGear(row.keywords, itemNames);
                return (
                  <tr
                    key={row.label}
                    className={`border-b border-border transition-colors ${
                      owned ? '' : 'bg-threat-red/[0.06]'
                    }`}
                  >
                    <td className="px-3 py-2 font-medium sticky left-0 bg-surface z-10">
                      <div className="flex items-center gap-2">
                        <span className={owned ? 'text-text-primary' : 'text-threat-red'}>
                          {row.label}
                        </span>
                        {!owned && (
                          <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-threat-red/15 text-threat-red font-semibold uppercase">
                            Missing
                          </span>
                        )}
                      </div>
                    </td>
                    {SCENARIOS.map((s) => {
                      const rel = row.relevance[s.id];
                      const ind = INDICATOR[rel];
                      return (
                        <td key={s.id} className="px-2 py-2 text-center">
                          <span className={ind.color} title={ind.label}>
                            {ind.symbol}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Summary */}
          <div className="px-4 py-3 border-t border-border bg-surface-2">
            <div className="flex flex-wrap gap-4 text-xs">
              {SCENARIOS.map((s) => {
                const criticalItems = GEAR_MATRIX.filter((g) => g.relevance[s.id] === 'critical');
                const ownedCritical = criticalItems.filter((g) => userHasGear(g.keywords, itemNames)).length;
                const total = criticalItems.length;
                const pct = total > 0 ? Math.round((ownedCritical / total) * 100) : 100;
                const color = pct >= 80 ? 'text-threat-green' : pct >= 50 ? 'text-threat-yellow' : 'text-threat-red';
                return (
                  <div key={s.id} className="text-center">
                    <div className="text-text-dim mb-0.5">{s.icon} {s.label}</div>
                    <div className={`font-bold ${color}`}>{ownedCritical}/{total} critical</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
