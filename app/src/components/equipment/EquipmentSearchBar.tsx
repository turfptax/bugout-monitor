interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function EquipmentSearchBar({ value, onChange }: Props) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">
        &#128269;
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search equipment..."
        className="w-full bg-surface-2 border border-border rounded px-3 py-2 pl-8 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-accent transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-primary text-xs cursor-pointer"
        >
          &#10005;
        </button>
      )}
    </div>
  );
}
