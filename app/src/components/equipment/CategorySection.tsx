import { useState } from 'react';
import ItemRow from './ItemRow';
import type { EquipmentItem } from '../../types/equipment';

interface Props {
  category: string;
  items: EquipmentItem[];
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export default function CategorySection({ category, items, selectMode, selectedIds, onToggleSelect }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full cursor-pointer select-none flex items-center gap-2 py-2 bg-transparent border-none text-left"
      >
        <span
          className="text-text-dim text-xs transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          &#9654;
        </span>
        <span className="text-sm font-semibold text-text-primary">
          {category}
        </span>
        <span className="text-[0.68rem] text-text-dim bg-surface-2 border border-border px-1.5 py-0.5 rounded-full">
          {items.length}
        </span>
        {items.filter(i => i.status === 'wanted').length > 0 && (
          <span className="text-[0.62rem] text-threat-yellow bg-threat-yellow/10 border border-threat-yellow/30 px-1.5 py-0.5 rounded-full">
            {items.filter(i => i.status === 'wanted').length} wanted
          </span>
        )}
        {items.filter(i => i.status === 'ordered').length > 0 && (
          <span className="text-[0.62rem] text-accent-2 bg-accent-2/10 border border-accent-2/30 px-1.5 py-0.5 rounded-full">
            {items.filter(i => i.status === 'ordered').length} ordered
          </span>
        )}
      </button>

      {isOpen && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm animate-fade-in">
            <thead>
              <tr>
                {selectMode && (
                  <th className="bg-surface-2 text-accent text-center px-2 py-1.5 border border-border text-xs uppercase tracking-wider font-semibold w-10">
                  </th>
                )}
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider font-semibold">
                  Item
                </th>
                <th className="bg-surface-2 text-accent text-center px-3 py-1.5 border border-border text-xs uppercase tracking-wider font-semibold w-16">
                  Qty
                </th>
                <th className="bg-surface-2 text-accent text-center px-3 py-1.5 border border-border text-xs uppercase tracking-wider font-semibold w-24">
                  Status
                </th>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider font-semibold hidden sm:table-cell">
                  Notes
                </th>
                {items.some((i) => i.added) && (
                  <th className="bg-surface-2 text-accent text-center px-2 py-1.5 border border-border text-xs uppercase tracking-wider font-semibold w-10">
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  selectMode={selectMode}
                  isSelected={selectedIds?.has(item.id) ?? false}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
