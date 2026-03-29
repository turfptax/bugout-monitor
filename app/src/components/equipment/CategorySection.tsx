import { useState } from 'react';
import ItemRow from './ItemRow';
import type { EquipmentItem } from '../../types/equipment';

interface Props {
  category: string;
  items: EquipmentItem[];
}

export default function CategorySection({ category, items }: Props) {
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
      </button>

      {isOpen && (
        <table className="w-full border-collapse text-sm animate-fade-in">
          <thead>
            <tr>
              <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider font-semibold">
                Item
              </th>
              <th className="bg-surface-2 text-accent text-center px-3 py-1.5 border border-border text-xs uppercase tracking-wider font-semibold w-16">
                Qty
              </th>
              <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider font-semibold">
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
              <ItemRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
