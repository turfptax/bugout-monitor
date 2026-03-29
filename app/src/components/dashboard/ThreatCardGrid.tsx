import ThreatCard from './ThreatCard';
import type { ThreatAssessment } from '../../types/threat';

interface Props {
  assessment: ThreatAssessment;
}

const cards = [
  { key: 'solar' as const, icon: '\u2600\uFE0F', title: 'Solar / Carrington' },
  { key: 'nuclear' as const, icon: '\u2622\uFE0F', title: 'Nuclear Threat' },
  { key: 'weather' as const, icon: '\uD83C\uDF2A\uFE0F', title: 'Weather / Tornado' },
  { key: 'overall' as const, icon: '\uD83C\uDFAF', title: 'Overall Threat' },
];

export default function ThreatCardGrid({ assessment }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
      {cards.map((c) => (
        <ThreatCard
          key={c.key}
          icon={c.icon}
          title={c.title}
          data={assessment[c.key]}
        />
      ))}
    </div>
  );
}
