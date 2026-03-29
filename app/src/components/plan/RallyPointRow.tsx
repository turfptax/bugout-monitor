import { useState } from 'react';

interface Props {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export default function RallyPointRow({ label, value, placeholder, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const hasValue = value.trim().length > 0;

  const commit = () => {
    onChange(draft);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <tr>
        <td className="py-1.5 px-3 border border-border text-sm font-medium text-accent-2">
          {label}
        </td>
        <td className="py-1.5 px-3 border border-border" colSpan={2}>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-surface border border-accent rounded px-2 py-1 text-sm text-text-primary focus:outline-none"
          />
        </td>
      </tr>
    );
  }

  return (
    <tr
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className="cursor-pointer hover:bg-accent/[0.04] transition-colors"
    >
      <td className="py-1.5 px-3 border border-border text-sm font-medium text-accent-2">
        {label}
      </td>
      <td
        className={`py-1.5 px-3 border text-sm ${
          hasValue
            ? 'border-threat-green/30 text-text-primary'
            : 'border-dashed border-accent-2/40 text-text-dim italic'
        }`}
        colSpan={2}
      >
        {hasValue ? value : placeholder}
      </td>
    </tr>
  );
}
