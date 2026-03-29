import { useState, useMemo } from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useUIStore } from '../../store/useUIStore';
import { EQUIPMENT_CATEGORIES } from '../../types/equipment';
import { parseCSV, parseJSON, toCSV } from '../../lib/importEquipment';
import AddItemForm from './AddItemForm';
import EquipmentSearchBar from './EquipmentSearchBar';
import CategorySection from './CategorySection';
import HelpIcon from '../layout/HelpIcon';

export default function EquipmentTab() {
  const items = useEquipmentStore((s) => s.items);
  const importItems = useEquipmentStore((s) => s.importItems);
  const mergeItems = useEquipmentStore((s) => s.mergeItems);
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

  const [showImportPanel, setShowImportPanel] = useState(false);

  const handleExportJSON = () => {
    const data = exportItems();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bugout-inventory-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', `Exported ${data.length} items as JSON`);
  };

  const handleExportCSV = () => {
    const data = exportItems();
    const csv = toCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bugout-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', `Exported ${data.length} items as CSV`);
  };

  const handleImportFile = (mode: 'replace' | 'merge') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const isCSV = file.name.endsWith('.csv') || file.name.endsWith('.txt') ||
          (!file.name.endsWith('.json') && text.trim().startsWith('name') && text.includes(','));

        const parsed = isCSV ? parseCSV(text) : parseJSON(text);

        if (parsed.length === 0) {
          showToast('error', 'No valid items found in file');
          return;
        }

        if (mode === 'replace') {
          importItems(parsed);
          showToast('success', `Imported ${parsed.length} items (replaced existing)`);
        } else {
          mergeItems(parsed);
          showToast('success', `Merged ${parsed.length} items (skipped duplicates)`);
        }
        setShowImportPanel(false);
      } catch (err) {
        showToast('error', `Import failed: ${err instanceof Error ? err.message : 'invalid file'}`);
      }
    };
    input.click();
  };

  const handleLoadStarterKit = async () => {
    try {
      const res = await fetch('./templates/starter-kit-basic.json');
      if (!res.ok) throw new Error('Could not load starter kit');
      const data = await res.json();
      const parsed = parseJSON(JSON.stringify(data));
      mergeItems(parsed);
      showToast('success', `Loaded ${parsed.length} items from starter kit`);
      setShowImportPanel(false);
    } catch (err) {
      showToast('error', `Failed to load starter kit: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  const handleDownloadTemplate = () => {
    const a = document.createElement('a');
    a.href = './templates/equipment-template.csv';
    a.download = 'equipment-template.csv';
    a.click();
    showToast('info', 'Template CSV downloaded — fill it out and import');
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
          <div className="relative group">
            <button
              className="px-3 py-1 border border-border rounded text-xs text-text-dim hover:text-text-primary hover:border-accent-2 transition-colors cursor-pointer"
            >
              Export ▾
            </button>
            <div className="absolute right-0 mt-1 w-40 bg-surface border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={handleExportJSON} className="w-full text-left px-3 py-2 text-xs text-text-dim hover:text-text-primary hover:bg-surface-2 cursor-pointer">
                Export as JSON
              </button>
              <button onClick={handleExportCSV} className="w-full text-left px-3 py-2 text-xs text-text-dim hover:text-text-primary hover:bg-surface-2 cursor-pointer">
                Export as CSV
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowImportPanel(!showImportPanel)}
            className={`px-3 py-1 border rounded text-xs transition-colors cursor-pointer ${
              showImportPanel
                ? 'border-accent text-accent bg-accent/10'
                : 'border-border text-text-dim hover:text-text-primary hover:border-accent-2'
            }`}
          >
            Import ▾
          </button>
        </div>
      </div>

      {/* Import Panel */}
      {showImportPanel && (
        <div className="bg-surface border border-accent/30 rounded-lg p-4 mb-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Import Equipment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {/* Starter Kit */}
            <button
              onClick={handleLoadStarterKit}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-surface-2 hover:border-threat-green hover:bg-threat-green/5 transition-all cursor-pointer text-center"
            >
              <span className="text-2xl">🎒</span>
              <span className="text-xs font-semibold text-text-primary">Load Starter Kit</span>
              <span className="text-[10px] text-text-dim">40+ recommended items for a complete 72-hour bugout bag</span>
            </button>

            {/* Import CSV/JSON - Merge */}
            <button
              onClick={() => handleImportFile('merge')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-surface-2 hover:border-accent-2 hover:bg-accent-2/5 transition-all cursor-pointer text-center"
            >
              <span className="text-2xl">📄</span>
              <span className="text-xs font-semibold text-text-primary">Import File (Merge)</span>
              <span className="text-[10px] text-text-dim">Add items from CSV or JSON — skips duplicates, keeps existing items</span>
            </button>

            {/* Import CSV/JSON - Replace */}
            <button
              onClick={() => handleImportFile('replace')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-surface-2 hover:border-threat-red hover:bg-threat-red/5 transition-all cursor-pointer text-center"
            >
              <span className="text-2xl">🔄</span>
              <span className="text-xs font-semibold text-text-primary">Import File (Replace)</span>
              <span className="text-[10px] text-text-dim">Replace ALL items with imported file — use for full inventory swap</span>
            </button>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <button
              onClick={handleDownloadTemplate}
              className="text-[11px] text-accent-2 hover:underline cursor-pointer"
            >
              📥 Download CSV template
            </button>
            <span className="text-[10px] text-text-dim">Accepted formats: .csv, .json, .txt</span>
          </div>
        </div>
      )}

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
