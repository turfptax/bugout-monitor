import { levelColor, levelBg, levelLabel } from '../../lib/threatLevels';
import HelpIcon from '../layout/HelpIcon';
import type { ThreatLevel } from '../../types/threat';

interface Props {
  overall: ThreatLevel;
}

export default function ThreatHero({ overall }: Props) {
  const color = levelColor(overall.level);
  const bg = levelBg(overall.level);
  const pct = overall.level / 10;
  const circumference = 2 * Math.PI * 50;
  const dashOffset = circumference * (1 - pct);

  return (
    <div
      className="rounded-lg border border-border p-6 mb-4 flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-8"
      style={{ background: bg, borderLeft: `4px solid ${color}` }}
    >
      <div className="flex-shrink-0">
        <svg width="140" height="140" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="#30363d"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 60 60)"
            style={{ animation: 'ring-fill 1s ease-out', transition: 'stroke-dashoffset 0.5s ease' }}
          />
          <text
            x="60"
            y="55"
            textAnchor="middle"
            fill={color}
            fontSize="32"
            fontWeight="800"
          >
            {overall.level}
          </text>
          <text
            x="60"
            y="75"
            textAnchor="middle"
            fill="#8b949e"
            fontSize="11"
            fontWeight="600"
          >
            / 10
          </text>
        </svg>
      </div>

      <div className="flex-1 text-center md:text-left">
        <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
          <span className="text-xs uppercase tracking-widest text-text-dim font-semibold">
            Overall Threat Level
          </span>
          <HelpIcon helpKey="threat-overall" />
        </div>
        <div className="flex items-center gap-3 justify-center md:justify-start mb-3">
          <span
            className="text-sm font-bold uppercase tracking-wider px-3 py-1 rounded"
            style={{
              color,
              background: bg,
              border: `1px solid ${color}40`,
            }}
          >
            {overall.label || levelLabel(overall.level)}
          </span>
        </div>
        <p className="text-sm text-text-dim leading-relaxed max-w-xl">
          {overall.reasoning}
        </p>
      </div>
    </div>
  );
}
