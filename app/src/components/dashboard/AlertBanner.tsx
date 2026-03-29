import { useState, useMemo, useEffect } from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useThreatStore } from '../../store/useThreatStore';
import { useSettingsStore } from '../../store/useSettingsStore';

interface Alert {
  id: string;
  icon: string;
  message: string;
  color: 'red' | 'yellow' | 'accent';
}

const LS_KEY = 'bugout-dismissed-alerts';
const LS_THREAT_SNAPSHOT_KEY = 'bugout-alert-threat-snapshot';

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function setDismissed(ids: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
}

/** Build a snapshot string from threat levels so we can detect changes. */
function threatSnapshot(solar: number, nuclear: number, weather: number, overall: number): string {
  return `${solar}-${nuclear}-${weather}-${overall}`;
}

function getRallyPoints(): { primary: string; secondary: string; outOfArea: string } {
  try {
    const raw = localStorage.getItem('bugout-rally');
    return raw ? JSON.parse(raw) : { primary: '', secondary: '', outOfArea: '' };
  } catch {
    return { primary: '', secondary: '', outOfArea: '' };
  }
}

function getRoutes(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem('bugout-routes');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const colorMap = {
  red: {
    bg: 'bg-threat-red/10',
    border: 'border-threat-red/30',
    text: 'text-threat-red',
    dismissHover: 'hover:text-threat-red',
  },
  yellow: {
    bg: 'bg-threat-yellow/10',
    border: 'border-threat-yellow/30',
    text: 'text-threat-yellow',
    dismissHover: 'hover:text-threat-yellow',
  },
  accent: {
    bg: 'bg-accent/10',
    border: 'border-accent/30',
    text: 'text-accent',
    dismissHover: 'hover:text-accent',
  },
};

export default function AlertBanner() {
  const items = useEquipmentStore((s) => s.items);
  const threatData = useThreatStore((s) => s.data);
  const aiProvider = useSettingsStore((s) => s.aiProvider);

  const [dismissed, setDismissedState] = useState<Set<string>>(getDismissed);
  const [collapsed, setCollapsed] = useState(false);

  // Reset dismissed alerts when threat levels change
  const solar = threatData?.assessment.solar.level ?? 0;
  const nuclear = threatData?.assessment.nuclear.level ?? 0;
  const weather = threatData?.assessment.weather.level ?? 0;
  const overall = threatData?.assessment.overall.level ?? 0;

  useEffect(() => {
    const current = threatSnapshot(solar, nuclear, weather, overall);
    const previous = localStorage.getItem(LS_THREAT_SNAPSHOT_KEY);
    if (previous && previous !== current) {
      // Threat levels changed -- clear dismissed alerts
      setDismissedState(new Set());
      setDismissed(new Set());
    }
    localStorage.setItem(LS_THREAT_SNAPSHOT_KEY, current);
  }, [solar, nuclear, weather, overall]);

  const alerts = useMemo<Alert[]>(() => {
    const result: Alert[] = [];
    const haveItems = items.filter((i) => i.status === 'have' || !i.status);

    const hasItemMatching = (keywords: string[]) =>
      haveItems.some((item) => {
        const name = item.name.toLowerCase();
        const cat = (item.category || '').toLowerCase();
        return keywords.some((kw) => name.includes(kw) || cat.includes(kw));
      });

    // High threat + no equipment
    const anyHighThreat =
      solar >= 7 || nuclear >= 7 || weather >= 7 || overall >= 7;
    if (anyHighThreat && items.length === 0) {
      result.push({
        id: 'high-threat-no-equipment',
        icon: '\u26A0\uFE0F',
        message:
          'High threat detected but you have no equipment! Go to Equipment tab to start building your kit.',
        color: 'red',
      });
    }

    // Nuclear + no Faraday bags
    if (nuclear >= 5 && !hasItemMatching(['faraday'])) {
      result.push({
        id: 'nuclear-no-faraday',
        icon: '\u2622\uFE0F',
        message:
          'Nuclear threat is elevated. Consider adding Faraday bags to protect your electronics.',
        color: 'red',
      });
    }

    // Nuclear + no Geiger counter
    if (nuclear >= 5 && !hasItemMatching(['geiger'])) {
      result.push({
        id: 'nuclear-no-geiger',
        icon: '\u2622\uFE0F',
        message:
          'Nuclear threat elevated \u2014 a Geiger counter is critical for fallout detection.',
        color: 'red',
      });
    }

    // Solar + no solar panels or power banks
    if (
      solar >= 5 &&
      !hasItemMatching(['solar panel', 'power bank', 'powerbank', 'battery bank'])
    ) {
      result.push({
        id: 'solar-no-power',
        icon: '\u2600\uFE0F',
        message:
          'Solar threat elevated \u2014 solar charging capability is recommended.',
        color: 'yellow',
      });
    }

    // Weather + no shelter items
    if (
      weather >= 6 &&
      !hasItemMatching(['shelter', 'tent', 'tarp', 'bivy'])
    ) {
      result.push({
        id: 'weather-no-shelter',
        icon: '\uD83C\uDF2A\uFE0F',
        message:
          'Severe weather threat \u2014 ensure you have emergency shelter.',
        color: 'yellow',
      });
    }

    // Rally points not set
    const rally = getRallyPoints();
    const rallySet = [rally.primary, rally.secondary, rally.outOfArea].filter(
      (v) => v && v.trim() !== '' && v !== '[Not set]'
    );
    if (rallySet.length < 3) {
      result.push({
        id: 'rally-points-missing',
        icon: '\uD83D\uDCCD',
        message:
          'Rally points not configured \u2014 go to My Plan to set meeting locations.',
        color: 'accent',
      });
    }

    // No AI provider configured
    if (aiProvider === 'none') {
      result.push({
        id: 'no-ai-provider',
        icon: '\uD83E\uDD16',
        message:
          'No AI assistant configured \u2014 go to Settings to connect OpenRouter or LM Studio.',
        color: 'accent',
      });
    }

    return result;
  }, [items, solar, nuclear, weather, overall, aiProvider]);

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));

  if (visibleAlerts.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissedState(next);
    setDismissed(next);
  };

  const showCollapse = visibleAlerts.length > 3;
  const displayed = collapsed ? visibleAlerts.slice(0, 3) : visibleAlerts;

  return (
    <div className="space-y-2 mb-4">
      {displayed.map((alert) => {
        const colors = colorMap[alert.color];
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 px-4 py-2.5 rounded-lg border ${colors.bg} ${colors.border} animate-fade-in`}
          >
            <span className="text-base leading-none mt-0.5 shrink-0">
              {alert.icon}
            </span>
            <span className={`text-xs font-medium ${colors.text} flex-1`}>
              {alert.message}
            </span>
            <button
              onClick={() => dismiss(alert.id)}
              className={`text-text-dim ${colors.dismissHover} text-sm leading-none cursor-pointer shrink-0 p-0.5`}
              title="Dismiss"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        );
      })}

      {showCollapse && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-xs text-accent hover:underline cursor-pointer px-1"
        >
          {collapsed
            ? `Show ${visibleAlerts.length - 3} more alert${visibleAlerts.length - 3 > 1 ? 's' : ''}`
            : 'Show fewer alerts'}
        </button>
      )}
    </div>
  );
}
