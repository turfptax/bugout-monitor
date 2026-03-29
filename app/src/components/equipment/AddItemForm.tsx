import { useState } from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useUIStore } from '../../store/useUIStore';
import { EQUIPMENT_CATEGORIES } from '../../types/equipment';

export default function AddItemForm() {
  const addItem = useEquipmentStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast);

  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [category, setCategory] = useState<string>(EQUIPMENT_CATEGORIES[0]);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Item name is required');
      return;
    }
    addItem({ name: name.trim(), qty, category, notes: notes.trim() });
    showToast('success', `Added "${name.trim()}" to ${category}`);
    setName('');
    setQty('1');
    setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[160px]">
        <label className="block text-[0.68rem] text-text-dim uppercase tracking-wider mb-1">
          Item Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sawyer Squeeze"
          className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="w-16">
        <label className="block text-[0.68rem] text-text-dim uppercase tracking-wider mb-1">
          Qty
        </label>
        <input
          type="text"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="min-w-[180px]">
        <label className="block text-[0.68rem] text-text-dim uppercase tracking-wider mb-1">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer"
        >
          {EQUIPMENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[120px]">
        <label className="block text-[0.68rem] text-text-dim uppercase tracking-wider mb-1">
          Notes
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
          className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <button
        type="submit"
        className="px-4 py-1.5 bg-accent text-bg rounded text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap"
      >
        + Add Item
      </button>
    </form>
  );
}
