import { useState, useEffect } from 'react';
import { useSettingsStore, type AiProvider } from '../../store/useSettingsStore';
import { testConnection } from '../../lib/aiClient';

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
            <input
              type="text"
              value={lmstudioUrl}
              onChange={(e) => setLmstudioUrl(e.target.value)}
              placeholder="http://localhost:1234"
              className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-text-primary
                placeholder:text-text-dim/40 outline-none focus:border-accent/50 transition-colors"
            />
            <p className="text-[10px] text-text-dim mt-1">
              Start LM Studio and enable the local server. Default port is 1234.
            </p>
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
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {testResult.error}
            </>
          )}
        </div>
      )}
    </div>
  );
}
