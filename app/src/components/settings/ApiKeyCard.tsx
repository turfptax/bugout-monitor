import { useState } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import HelpIcon from '../layout/HelpIcon';

interface Props {
  keyName: string;
  label: string;
  description: string;
  helpUrl?: string;
}

export default function ApiKeyCard({ keyName, label, description, helpUrl }: Props) {
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  const value = (apiKeys as Record<string, string | undefined>)[keyName] || '';

  const handleTest = () => {
    setTestStatus('testing');
    setTimeout(() => {
      setTestStatus(value.trim().length > 0 ? 'ok' : 'fail');
      setTimeout(() => setTestStatus('idle'), 2000);
    }, 800);
  };

  return (
    <div className="bg-surface border border-border rounded-md p-4">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-semibold text-text-primary m-0">{label}</h4>
        <HelpIcon helpKey="settings-api" />
      </div>
      <p className="text-xs text-text-dim mb-3">{description}</p>
      {helpUrl && (
        <a href={helpUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-2 hover:underline mb-3 block">
          Get API key &rarr;
        </a>
      )}
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setApiKey(keyName, e.target.value)}
          placeholder="Enter API key..."
          className="flex-1 bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-accent transition-colors"
        />
        <button
          onClick={handleTest}
          disabled={testStatus === 'testing'}
          className="px-3 py-1.5 border border-border rounded text-xs font-semibold cursor-pointer hover:border-accent-2 transition-colors disabled:opacity-50"
        >
          {testStatus === 'testing' ? '...' : testStatus === 'ok' ? '\u2705' : testStatus === 'fail' ? '\u274C' : 'Test'}
        </button>
      </div>
    </div>
  );
}
