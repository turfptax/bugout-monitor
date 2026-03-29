import { NavLink } from 'react-router-dom';
import { useThreatStore } from '../../store/useThreatStore';
import { useUIStore } from '../../store/useUIStore';
import { levelColor } from '../../lib/threatLevels';

export default function NavBar() {
  const data = useThreatStore((s) => s.data);
  const helpMode = useUIStore((s) => s.helpMode);
  const toggleHelp = useUIStore((s) => s.toggleHelp);

  const overallLevel = data?.assessment?.overall?.level ?? 0;

  const tabs = [
    { to: '/', label: 'Dashboard', icon: '\u2302' },
    { to: '/plan', label: 'My Plan', icon: '\uD83D\uDCCB' },
    { to: '/equipment', label: 'Equipment', icon: '\uD83C\uDF92' },
    { to: '/ai', label: 'AI Chat', icon: '\uD83E\uDD16' },
    { to: '/settings', label: 'Settings', icon: '\u2699\uFE0F' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-border h-14 flex items-center px-4 gap-2">
      <div className="flex items-center gap-2 mr-6">
        <span className="text-lg">&#x1F6E1;&#xFE0F;</span>
        <span className="text-accent font-bold text-sm tracking-wider uppercase">
          Bugout Monitor
        </span>
      </div>

      <div className="flex items-center gap-1 flex-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `px-3 py-1.5 text-xs font-medium rounded transition-colors duration-150 flex items-center gap-1.5 ${
                isActive
                  ? 'text-accent bg-accent/10 border-b-2 border-accent'
                  : 'text-text-dim hover:text-text-primary hover:bg-surface-2'
              }`
            }
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleHelp}
          className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center transition-colors duration-150 cursor-pointer ${
            helpMode
              ? 'bg-accent-2 border-accent-2 text-bg'
              : 'border-border text-text-dim hover:border-accent-2 hover:text-accent-2'
          }`}
          title="Toggle help mode"
        >
          ?
        </button>

        {overallLevel > 0 && (
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: levelColor(overallLevel) }}
              title={`Overall threat: ${overallLevel}/10`}
            />
          </div>
        )}
      </div>
    </nav>
  );
}
