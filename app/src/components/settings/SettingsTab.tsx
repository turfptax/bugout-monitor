import { useState, useRef } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useUIStore } from '../../store/useUIStore';
import ApiKeyCard from './ApiKeyCard';
import LocationCard from './LocationCard';
import AiProviderCard from './AiProviderCard';

// All localStorage keys that make up the user's data
const BACKUP_KEYS = [
  'bugout-settings',
  'bugout-inventory',
  'bugout-chat',
  'bugout-conversations',
  'bugout-threat-data',
  'bugout-rally',
  'bugout-routes',
  'bugout-comms',
  'bugout-shelter',
  'bugout-contacts',
];

export default function SettingsTab() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-8 py-6">
      <h2 className="text-lg font-semibold text-text-primary mb-6">
        &#9881;&#65039; Settings
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Assistant — most prominent */}
        <AiProviderCard />

        {/* Theme */}
        <div className="bg-surface border border-border rounded-md p-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3">Appearance</h4>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium cursor-pointer transition-colors ${
                theme === 'dark'
                  ? 'bg-accent text-bg'
                  : 'bg-surface-2 border border-border text-text-dim hover:border-accent'
              }`}
            >
              &#127769; Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium cursor-pointer transition-colors ${
                theme === 'light'
                  ? 'bg-accent text-bg'
                  : 'bg-surface-2 border border-border text-text-dim hover:border-accent'
              }`}
            >
              &#9728;&#65039; Light
            </button>
          </div>
        </div>

        {/* Location */}
        <LocationCard />

        {/* API Keys */}
        <ApiKeyCard
          keyName="nws"
          label="NWS Weather API"
          description="National Weather Service API for local alerts. Free, no key required - optionally set a User-Agent."
          helpUrl="https://www.weather.gov/documentation/services-web-api"
        />
        <ApiKeyCard
          keyName="gdelt"
          label="GDELT API"
          description="Global Database of Events, Language, and Tone for geopolitical monitoring."
          helpUrl="https://www.gdeltproject.org/"
        />
        <ApiKeyCard
          keyName="noaa"
          label="NOAA / SWPC"
          description="Space weather data from NOAA Space Weather Prediction Center. Free, no key required."
          helpUrl="https://www.swpc.noaa.gov/"
        />

        {/* Backup & Restore */}
        <BackupRestoreCard />
      </div>
    </div>
  );
}

// ── Backup & Restore Card ──

function BackupRestoreCard() {
  const showToast = useUIStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restorePreview, setRestorePreview] = useState<{
    date: string;
    version: string;
    keys: string[];
    counts: Record<string, number>;
  } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<Record<string, unknown> | null>(null);

  // ── Export ──
  const handleExport = () => {
    const backup: Record<string, unknown> = {
      _meta: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        app: 'bugout-monitor',
        keys: [] as string[],
      },
    };

    const keys: string[] = [];
    for (const key of BACKUP_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try {
          backup[key] = JSON.parse(raw);
          keys.push(key);
        } catch {
          backup[key] = raw;
          keys.push(key);
        }
      }
    }
    (backup._meta as Record<string, unknown>).keys = keys;

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `bugout-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('success', `Backup exported (${keys.length} data stores)`);
  };

  // ── Import preview ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);

        // Validate it's a bugout backup
        if (!data._meta || data._meta.app !== 'bugout-monitor') {
          showToast('error', 'Invalid backup file — not a Bugout Monitor backup');
          return;
        }

        const keys = Object.keys(data).filter(k => k !== '_meta');
        const counts: Record<string, number> = {};
        for (const key of keys) {
          const val = data[key];
          if (Array.isArray(val)) {
            counts[key] = val.length;
          } else if (val?.state?.items && Array.isArray(val.state.items)) {
            counts[key] = val.state.items.length;
          } else if (val?.state?.messages && Array.isArray(val.state.messages)) {
            counts[key] = val.state.messages.length;
          } else {
            counts[key] = 1;
          }
        }

        setRestorePreview({
          date: data._meta.exportedAt || 'Unknown',
          version: data._meta.version || '?',
          keys,
          counts,
        });
        setPendingRestore(data);
      } catch {
        showToast('error', 'Failed to parse backup file');
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // ── Restore ──
  const handleRestore = () => {
    if (!pendingRestore) return;

    let restored = 0;
    for (const [key, value] of Object.entries(pendingRestore)) {
      if (key === '_meta') continue;
      try {
        localStorage.setItem(key, JSON.stringify(value));
        restored++;
      } catch (err) {
        console.error(`Failed to restore ${key}:`, err);
      }
    }

    setRestorePreview(null);
    setPendingRestore(null);
    showToast('success', `Restored ${restored} data stores. Reloading...`);

    // Reload to pick up restored data in all stores
    setTimeout(() => window.location.reload(), 1500);
  };

  const friendlyName = (key: string) => {
    const names: Record<string, string> = {
      'bugout-settings': '⚙️ Settings & Location',
      'bugout-inventory': '🎒 Equipment Inventory',
      'bugout-chat': '💬 Chat History',
      'bugout-conversations': '💾 Saved Conversations',
      'bugout-threat-data': '🎯 Threat Data',
      'bugout-rally': '📍 Rally Points',
      'bugout-routes': '🗺️ Bugout Routes',
      'bugout-comms': '📻 Communications Plan',
      'bugout-shelter': '🏠 Shelter-in-Place Plan',
      'bugout-contacts': '📞 Emergency Contacts',
    };
    return names[key] || key;
  };

  // Count current data
  const currentDataCount = BACKUP_KEYS.filter(k => localStorage.getItem(k) !== null).length;

  return (
    <div className="bg-surface border border-border rounded-md p-4 md:col-span-2">
      <h4 className="text-sm font-semibold text-text-primary mb-1">💾 Backup & Restore</h4>
      <p className="text-xs text-text-dim mb-2">
        All your data is stored locally in this browser. Export a backup file to save your plan, equipment, routes, and settings.
        Restore from a backup after reinstalling or on a new device.
      </p>
      <p className="text-[0.68rem] text-threat-yellow mb-4 flex items-center gap-1.5">
        <span>⚠️</span> Backup files include your API keys (OpenRouter, NASA, etc.). Keep them private — don't commit to git or share publicly.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        {/* Export button */}
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-accent text-bg rounded text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <span>📥</span> Export Backup
          <span className="text-[0.68rem] opacity-75">({currentDataCount} stores)</span>
        </button>

        {/* Import button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-surface-2 border border-border rounded text-sm font-medium text-text-primary cursor-pointer hover:border-accent transition-colors flex items-center gap-2"
        >
          <span>📤</span> Import Backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Reset button */}
        <button
          onClick={() => {
            if (confirm('⚠️ Delete ALL data? This removes your entire plan, equipment, settings, and chat history. This cannot be undone.\n\nExport a backup first if you want to keep your data.')) {
              BACKUP_KEYS.forEach(k => localStorage.removeItem(k));
              window.location.reload();
            }
          }}
          className="px-4 py-2 border border-border rounded text-sm text-text-dim cursor-pointer hover:text-threat-red hover:border-threat-red transition-colors flex items-center gap-2 ml-auto"
        >
          <span>🗑️</span> Reset All Data
        </button>
      </div>

      {/* Restore preview */}
      {restorePreview && (
        <div className="bg-surface-2 border border-accent/30 rounded-md p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-semibold text-accent">📄 Backup Preview</h5>
            <span className="text-[0.68rem] text-text-dim">
              Exported: {new Date(restorePreview.date).toLocaleString()} &middot; v{restorePreview.version}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {restorePreview.keys.map(key => (
              <div key={key} className="flex items-center gap-2 text-xs text-text-dim">
                <span className="w-2 h-2 rounded-full bg-threat-green inline-block"></span>
                <span>{friendlyName(key)}</span>
                {restorePreview.counts[key] > 1 && (
                  <span className="text-[0.62rem] bg-surface border border-border px-1 rounded">
                    {restorePreview.counts[key]} items
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRestore}
              className="px-4 py-2 bg-threat-green text-bg rounded text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
            >
              ✅ Restore This Backup
            </button>
            <button
              onClick={() => { setRestorePreview(null); setPendingRestore(null); }}
              className="px-4 py-2 border border-border rounded text-sm text-text-dim cursor-pointer hover:border-threat-red transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="text-[0.68rem] text-threat-yellow mt-3">
            ⚠️ Restoring will overwrite your current data. The page will reload after restore.
          </p>
        </div>
      )}

      {/* Current data summary */}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="text-[0.68rem] text-text-dim uppercase tracking-wider mb-2">Current Data</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {BACKUP_KEYS.map(key => {
            const raw = localStorage.getItem(key);
            const has = raw !== null;
            return (
              <span key={key} className={`text-xs ${has ? 'text-text-dim' : 'text-text-dim/40'}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${has ? 'bg-threat-green' : 'bg-border'}`}></span>
                {friendlyName(key).replace(/^[^\s]+ /, '')}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
