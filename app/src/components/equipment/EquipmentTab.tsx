import { useState, useMemo } from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useUIStore } from '../../store/useUIStore';
import { EQUIPMENT_CATEGORIES } from '../../types/equipment';
import AddItemForm from './AddItemForm';
import EquipmentSearchBar from './EquipmentSearchBar';
import CategorySection from './CategorySection';
import HelpIcon from '../layout/HelpIcon';

export default function EquipmentTab() {
  const items = useEquipmentStore((s) => s.items);
  const importItems = useEquipmentStore((s) => s.importItems);
  const exportItems = useEquipmentStore((s) => s.exportItems);
  const showToast = useUIStore((s) => s.showToast);
  const [search, setSearch] = useState('');

  const filteredByCategory = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    const filtered = search
      ? items.filter(
          (i) =>
            i.name.toLowerCase().includes(lowerSearch) ||
            i.notes.toLowerCase().includes(lowerSearch) ||
            i.category.toLowerCase().includes(lowerSearch)
        )
      : items;

    const grouped: Record<string, typeof items> = {};
    for (const cat of EQUIPMENT_CATEGORIES) {
      const catItems = filtered.filter((i) => i.category === cat);
      if (catItems.length > 0) grouped[cat] = catItems;
    }
    return grouped;
  }, [items, search]);

  const handleExport = () => {
    const data = exportItems();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bugout-inventory-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', `Exported ${data.length} items`);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error('Invalid format');
        importItems(data);
        showToast('success', `Imported ${data.length} items`);
      } catch {
        showToast('error', 'Failed to import: invalid JSON');
      }
    };
    input.click();
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-text-primary m-0">
            &#127890; Equipment Inventory
          </h2>
          <HelpIcon helpKey="equipment-inventory" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-dim">
            {items.length} items
          </span>
          <button
            onClick={handleExport}
            className="px-3 py-1 border border-border rounded text-xs text-text-dim hover:text-text-primary hover:border-accent-2 transition-colors cursor-pointer"
          >
            Export
          </button>
          <button
            onClick={handleImport}
            className="px-3 py-1 border border-border rounded text-xs text-text-dim hover:text-text-primary hover:border-accent-2 transition-colors cursor-pointer"
          >
            Import
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-4 mb-4">
        <AddItemForm />
      </div>

      <div className="mb-4 max-w-sm">
        <EquipmentSearchBar value={search} onChange={setSearch} />
      </div>

      {Object.keys(filteredByCategory).length === 0 ? (
        <div className="text-center py-12 text-text-dim">
          <div className="text-3xl mb-2">&#127890;</div>
          <div className="text-sm">
            {search ? 'No items match your search' : 'No equipment added yet. Use the form above to add items.'}
          </div>
        </div>
      ) : (
        Object.entries(filteredByCategory).map(([cat, catItems]) => (
          <CategorySection key={cat} category={cat} items={catItems} />
        ))
      )}
    </div>
  );
}
