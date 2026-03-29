import { useSettingsStore } from '../../store/useSettingsStore';
import ApiKeyCard from './ApiKeyCard';
import LocationCard from './LocationCard';

export default function SettingsTab() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-8 py-6">
      <h2 className="text-lg font-semibold text-text-primary mb-6">
        &#9881;&#65039; Settings
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Data Management */}
        <div className="bg-surface border border-border rounded-md p-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3">Data Management</h4>
          <p className="text-xs text-text-dim mb-3">
            All data is stored locally in your browser. Nothing is sent to external servers.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (confirm('Reset all settings to defaults? Equipment data will be preserved.')) {
                  useSettingsStore.getState().setTheme('dark');
                  useSettingsStore.getState().setLocation({ city: '', state: '', nearbyTargets: [] });
                }
              }}
              className="px-3 py-1.5 border border-border rounded text-xs text-text-dim hover:text-threat-red hover:border-threat-red transition-colors cursor-pointer"
            >
              Reset Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
