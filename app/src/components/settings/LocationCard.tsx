import { useState } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import HelpIcon from '../layout/HelpIcon';

export default function LocationCard() {
  const location = useSettingsStore((s) => s.location);
  const setLocation = useSettingsStore((s) => s.setLocation);
  const addNearbyTarget = useSettingsStore((s) => s.addNearbyTarget);
  const removeNearbyTarget = useSettingsStore((s) => s.removeNearbyTarget);
  const [newTarget, setNewTarget] = useState('');

  const handleAddTarget = () => {
    if (newTarget.trim()) {
      addNearbyTarget(newTarget.trim());
      setNewTarget('');
    }
  };

  return (
    <div className="bg-surface border border-border rounded-md p-4">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm font-semibold text-text-primary m-0">Location</h4>
        <HelpIcon helpKey="settings-location" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[0.68rem] text-text-dim uppercase tracking-wider mb-1">City</label>
          <input
            type="text"
            value={location.city}
            onChange={(e) => setLocation({ city: e.target.value })}
            placeholder="e.g. Lincoln"
            className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label className="block text-[0.68rem] text-text-dim uppercase tracking-wider mb-1">State</label>
          <input
            type="text"
            value={location.state}
            onChange={(e) => setLocation({ state: e.target.value })}
            placeholder="e.g. NE"
            className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-[0.68rem] text-text-dim uppercase tracking-wider mb-1">
          Nearby Targets / Points of Interest
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTarget()}
            placeholder="e.g. Offutt AFB, nuclear plant..."
            className="flex-1 bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={handleAddTarget}
            className="px-3 py-1.5 border border-border rounded text-xs font-semibold cursor-pointer hover:border-accent transition-colors"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {location.nearbyTargets.map((target, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-2 border border-border rounded text-xs text-text-dim"
            >
              {target}
              <button
                onClick={() => removeNearbyTarget(i)}
                className="text-threat-red hover:text-threat-extreme cursor-pointer ml-0.5"
              >
                &#10005;
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
