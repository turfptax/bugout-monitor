import { useState, useEffect } from 'react';
import { useSettingsStore, type AiProvider } from '../../store/useSettingsStore';
import { testConnection, scanForLMStudio, type DiscoveredServer } from '../../lib/aiClient';

const OPENROUTER_MODELS = [
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
  { id: 'google/gemini-2.5-flash-preview', label: 'Gemini 2.5 Flash' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B' },
  { id: 'mistralai/mistral-7b-instruct', label: 'Mistral 7B' },
];

export default function AiProviderCard() {
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const openrouterKey = useSettingsStore((s) => s.openrouterKey);
  const openrouterModel = useSettingsStore((s) => s.openrouterModel);
  const lmstudioUrl = useSettingsStore((s) => s.lmstudioUrl);
  const lmstudioModel = useSettingsStore((s) => s.lmstudioModel);
  const setAiProvider = useSettingsStore((s) => s.setAiProvider);
  const setOpenrouterKey = useSettingsStore((s) => s.setOpenrouterKey);
  const setOpenrouterModel = useSettingsStore((s) => s.setOpenrouterModel);
  const setLmstudioUrl = useSettingsStore((s) => s.setLmstudioUrl);
  const setLmstudioModel = useSettingsStore((s) => s.setLmstudioModel);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string; models?: string[] } | null>(null);
  const [lmModels, setLmModels] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [discoveredServers, setDiscoveredServers] = useState<DiscoveredServer[]>([]);

  // Clear test result when provider changes
  useEffect(() => {
    setTestResult(null);
  }, [aiProvider]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection({
      provider: aiProvider,
      openrouterKey,
      openrouterModel,
      lmstudioUrl,
      lmstudioModel,
    });
    setTestResult(result);
    if (result.models && aiProvider === 'lmstudio') {
      setLmModels(result.models);
      if (result.models.length > 0 && !lmstudioModel) {
        setLmstudioModel(result.models[0]);
      }
    }
    setTesting(false);
  };

  const providers: { value: AiProvider; label: string; desc: string; icon: JSX.Element }[] = [
    {
      value: 'openrouter',
      label: 'OpenRouter',
      desc: 'Cloud AI models',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      ),
    },
    {
      value: 'lmstudio',
      label: 'LM Studio',
      desc: 'Local AI models',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      value: 'none',
      label: 'None',
      desc: 'AI disabled',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-surface border border-border rounded-md p-4 md:col-span-2">
      <div className="flex items-center gap-2 mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
          <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
          <line x1="10" y1="22" x2="14" y2="22" />
        </svg>
        <h4 className="text-sm font-semibold text-text-primary">AI Assistant</h4>
      </div>
      <p className="text-xs text-text-dim mb-4">
        Connect to an AI provider for personalized threat analysis, equipment recommendations, and planning advice.
      </p>

      {/* Provider selector cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {providers.map((p) => (
          <button
            key={p.value}
            onClick={() => setAiProvider(p.value)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center cursor-pointer transition-all duration-150
              ${aiProvider === p.value
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-surface-2 text-text-dim hover:border-accent/40'
              }`}
          >
            {p.icon}
            <span className="text-xs font-medium">{p.label}</span>
            <span className="text-[10px] opacity-70">{p.desc}</span>
          </button>
        ))}
      </div>

      {/* OpenRouter config */}
      {aiProvider === 'openrouter' && (
        <div className="space-y-3 animate-fade-in">
          <div>
            <label className="text-xs text-text-dim block mb-1">API Key</label>
            <input
              type="password"
              value={openrouterKey}
              onChange={(e) => setOpenrouterKey(e.target.value)}
              placeholder="sk-or-..."
              className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-text-primary
                placeholder:text-text-dim/40 outline-none focus:border-accent/50 transition-colors"
            />
            <p className="text-[10px] text-text-dim mt-1">
              Get a key at{' '}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                openrouter.ai/keys
              </a>
            </p>
          </div>
          <div>
            <label className="text-xs text-text-dim block mb-1">Model</label>
            <select
              value={openrouterModel}
              onChange={(e) => setOpenrouterModel(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-text-primary
                outline-none focus:border-accent/50 transition-colors cursor-pointer"
            >
              {OPENROUTER_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleTest}
            disabled={testing || !openrouterKey}
            className="px-3 py-1.5 rounded text-xs font-medium bg-accent/10 text-accent border border-accent/30
              hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      )}

      {/* LM Studio config */}
      {aiProvider === 'lmstudio' && (
        <div className="space-y-3 animate-fade-in">
          <div>
            <label className="text-xs text-text-dim block mb-1">Server URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={lmstudioUrl}
                onChange={(e) => setLmstudioUrl(e.target.value)}
                placeholder="http://localhost:1234"
                className="flex-1 bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-text-primary
                  placeholder:text-text-dim/40 outline-none focus:border-accent/50 transition-colors"
              />
              <button
                onClick={async () => {
                  setScanning(true);
                  setScanProgress('Scanning network...');
                  setDiscoveredServers([]);
                  const servers = await scanForLMStudio((server) => {
                    setDiscoveredServers(prev => [...prev, server]);
                    setScanProgress(`Found ${server.hostname}...`);
                  });
                  setScanProgress(servers.length === 0 ? 'No LM Studio servers found on network' : `Found ${servers.length} server${servers.length !== 1 ? 's' : ''}`);
                  setScanning(false);
                }}
                disabled={scanning}
                className="px-3 py-1.5 rounded text-xs font-medium bg-accent-2/10 text-accent-2 border border-accent-2/30
                  hover:bg-accent-2/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
              >
                {scanning ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Scanning...
                  </span>
                ) : '🔍 Scan Network'}
              </button>
            </div>
            {scanProgress && (
              <p className="text-[10px] text-text-dim mt-1">{scanProgress}</p>
            )}
          </div>

          {/* Discovered servers */}
          {discoveredServers.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs text-text-dim block">Discovered LM Studio Servers:</label>
              {discoveredServers.map((server) => (
                <button
                  key={server.url}
                  onClick={() => {
                    setLmstudioUrl(server.url);
                    setLmModels(server.models);
                    if (server.models.length > 0) {
                      setLmstudioModel(server.models[0]);
                    }
                    setTestResult({ ok: true, models: server.models });
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left cursor-pointer transition-all duration-150
                    ${lmstudioUrl === server.url
                      ? 'border-threat-green bg-threat-green/10 text-threat-green'
                      : 'border-border bg-surface-2 text-text-primary hover:border-accent/40'
                    }`}
                >
                  <div>
                    <div className="text-xs font-medium flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-threat-green"></span>
                      {server.url}
                    </div>
                    <div className="text-[10px] text-text-dim mt-0.5">
                      {server.models.length} model{server.models.length !== 1 ? 's' : ''}: {server.models.slice(0, 2).join(', ')}{server.models.length > 2 ? ` +${server.models.length - 2} more` : ''}
                    </div>
                  </div>
                  <span className="text-[10px] text-accent">
                    {lmstudioUrl === server.url ? '✓ Selected' : 'Use →'}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="bg-surface-2 border border-border rounded p-3 text-[11px] text-text-dim leading-relaxed">
            <p className="font-semibold text-text-primary mb-1.5">LM Studio Setup:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open LM Studio and <span className="text-accent">load a model</span></li>
              <li>Click the <span className="text-accent">&lt;/&gt; Local Server</span> tab (left sidebar)</li>
              <li>Click <span className="text-threat-green font-semibold">Start Server</span></li>
              <li>In server settings, enable <span className="text-accent">"Enable CORS"</span> (required for browser access)</li>
              <li>Click "Detect Models" below to verify</li>
            </ol>
          </div>
          <div>
            <label className="text-xs text-text-dim block mb-1">Model</label>
            <div className="flex gap-2">
              <select
                value={lmstudioModel}
                onChange={(e) => setLmstudioModel(e.target.value)}
                className="flex-1 bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-text-primary
                  outline-none focus:border-accent/50 transition-colors cursor-pointer"
              >
                {lmModels.length === 0 && !lmstudioModel && (
                  <option value="">Click Detect to find models</option>
                )}
                {lmstudioModel && !lmModels.includes(lmstudioModel) && (
                  <option value={lmstudioModel}>{lmstudioModel}</option>
                )}
                {lmModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-3 py-1.5 rounded text-xs font-medium bg-accent/10 text-accent border border-accent/30
                  hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
              >
                {testing ? 'Detecting...' : 'Detect Models'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test result */}
      {testResult && (
        <div className={`mt-3 px-3 py-2 rounded text-xs flex items-center gap-2 animate-fade-in
          ${testResult.ok
            ? 'bg-threat-green/10 border border-threat-green/30 text-threat-green'
            : 'bg-threat-red/10 border border-threat-red/30 text-threat-red'
          }`}
        >
          {testResult.ok ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Connected{testResult.models ? ` \u2014 ${testResult.models.length} model${testResult.models.length !== 1 ? 's' : ''} available` : ''}
            </>
          ) : (
            <div className="flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span className="whitespace-pre-line">{testResult.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
