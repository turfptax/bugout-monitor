import { levelColor, levelBg, levelBorder, levelLabel } from '../../lib/threatLevels';
import type { ThreatLevel } from '../../types/threat';

interface Props {
  icon: string;
  title: string;
  data: ThreatLevel;
}

export default function ThreatCard({ icon, title, data }: Props) {
  const isUnavailable = data.label === 'UNAVAILABLE';
  const color = isUnavailable ? '#8b949e' : levelColor(data.level);
  const bg = isUnavailable ? 'rgba(139,148,158,0.1)' : levelBg(data.level);
  const border = isUnavailable ? 'rgba(139,148,158,0.3)' : levelBorder(data.level);

  return (
    <div
      className="bg-surface-2 border border-border rounded-md p-3 transition-all duration-150 hover:border-border/80"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[0.7rem] text-text-dim uppercase tracking-wider truncate">
          {icon} {title}
        </span>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold leading-none" style={{ color }}>
          {isUnavailable ? '\u2014' : `${data.level}/10`}
        </span>
        <span
          className="text-[0.65rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
          style={{
            color: isUnavailable ? '#8b949e' : color,
            background: bg,
            border: `1px solid ${border}`,
          }}
        >
          {isUnavailable ? 'UNAVAILABLE' : (data.label || levelLabel(data.level))}
        </span>
      </div>
      <p className="text-[0.78rem] text-text-dim leading-snug">
        {data.reasoning}
      </p>
    </div>
  );
}
