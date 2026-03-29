import { levelColor, levelBg, levelBorder, levelLabel } from '../../lib/threatLevels';
import HelpIcon from '../layout/HelpIcon';
import type { DiamondIndex as DiamondIndexType } from '../../types/threat';

interface Props {
  diamond: DiamondIndexType;
}

const factors = [
  { key: 'environmental' as const, icon: '\uD83C\uDF3F', label: '1. Environmental Damage' },
  { key: 'climate' as const, icon: '\uD83C\uDF21\uFE0F', label: '2. Climate Change' },
  { key: 'hostile' as const, icon: '\u2694\uFE0F', label: '3. Hostile Neighbors' },
  { key: 'trade' as const, icon: '\uD83D\uDCE6', label: '4. Trade / Supply Chain' },
  { key: 'response' as const, icon: '\uD83C\uDFDB\uFE0F', label: "5. Society's Response" },
];

function FactorBar({ icon, label, level, reasoning }: {
  icon: string;
  label: string;
  level: number;
  reasoning: string;
}) {
  const color = levelColor(level);
  const pct = (level / 10) * 100;

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[0.72rem] text-text-dim">
          {icon} {label}
        </span>
        <span
          className="text-[0.82rem] font-bold tabular-nums"
          style={{ color }}
        >
          {level}/10
        </span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {reasoning && (
        <p className="text-[0.68rem] text-text-dim mt-0.5 leading-snug">
          {reasoning}
        </p>
      )}
    </div>
  );
}

export default function DiamondIndex({ diamond }: Props) {
  const composite = diamond.composite || { level: 0, label: 'UNAVAILABLE', reasoning: '' };
  const compositeColor = levelColor(composite.level);
  const compositeBg = levelBg(composite.level);
  const compositeBorder = levelBorder(composite.level);

  const leftFactors = factors.slice(0, 3);
  const rightFactors = factors.slice(3);

  return (
    <div
      className="bg-surface-2 border border-border rounded-md p-4 mb-4"
      style={{ borderLeft: `3px solid ${compositeColor}` }}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[0.7rem] text-accent uppercase tracking-wider font-semibold">
            &#128214; Diamond Collapse Index
          </span>
          <span className="text-[0.62rem] text-text-dim italic">
            Jared Diamond's 5-Factor Framework
          </span>
          <HelpIcon helpKey="diamond-index" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold leading-none" style={{ color: compositeColor }}>
            {composite.level}/10
          </span>
          <span
            className="text-[0.6rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
            style={{
              color: compositeColor,
              background: compositeBg,
              border: `1px solid ${compositeBorder}`,
            }}
          >
            {composite.label || levelLabel(composite.level)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <div>
          {leftFactors.map((f) => {
            const d = diamond[f.key];
            return (
              <FactorBar
                key={f.key}
                icon={f.icon}
                label={f.label}
                level={d?.level ?? 0}
                reasoning={d?.reasoning ?? ''}
              />
            );
          })}
        </div>
        <div>
          {rightFactors.map((f) => {
            const d = diamond[f.key];
            return (
              <FactorBar
                key={f.key}
                icon={f.icon}
                label={f.label}
                level={d?.level ?? 0}
                reasoning={d?.reasoning ?? ''}
              />
            );
          })}
          {composite.reasoning && (
            <div className="text-[0.7rem] text-text-dim mt-2 pt-2 border-t border-border leading-snug">
              <strong className="text-text-primary">Composite:</strong>{' '}
              {composite.reasoning}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
