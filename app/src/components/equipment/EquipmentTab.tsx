import { useState, useMemo, useCallback } from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useUIStore } from '../../store/useUIStore';
import { EQUIPMENT_CATEGORIES } from '../../types/equipment';
import { parseCSV, parseJSON, toCSV } from '../../lib/importEquipment';
import { exportShoppingListHTML, exportShoppingListCSV } from '../../lib/exportShoppingList';
import AddItemForm from './AddItemForm';
import EquipmentSearchBar from './EquipmentSearchBar';
import CategorySection from './CategorySection';
import HelpIcon from '../layout/HelpIcon';

type StatusFilter = 'all' | 'have' | 'wanted' | 'ordered';
type SortKey = 'category' | 'name' | 'status' | 'added';

export default function EquipmentTab() {
  const items = useEquipmentStore((s) => s.items);
  const importItems = useEquipmentStore((s) => s.importItems);
  const mergeItems = useEquipmentStore((s) => s.mergeItems);
  const exportItems = useEquipmentStore((s) => s.exportItems);
  const bulkUpdateStatus = useEquipmentStore((s) => s.bulkUpdateStatus);
  const bulkDelete = useEquipmentStore((s) => s.bulkDelete);
  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('category');
  const [showImportPanel, setShowImportPanel] = useState(false);

  // Bulk select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Stats ---
  const stats = useMemo(() => {
    const have = items.filter((i) => i.status === 'have').length;
    const wanted = items.filter((i) => i.status === 'wanted').length;
    const ordered = items.filter((i) => i.status === 'ordered').length;
    const categoriesUsed = new Set(items.map((i) => i.category)).size;
    const totalCategories = EQUIPMENT_CATEGORIES.length;
    const pct = items.length > 0 ? Math.round((have / items.length) * 100) : 0;
    return { total: items.length, have, wanted, ordered, categoriesUsed, totalCategories, pct };
  }, [items]);

  // --- Filtered + sorted items grouped by category ---
  const filteredByCategory = useMemo(() => {
    const lowerSearch = search.toLowerCase();

    let filtered = items;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((i) => i.status === statusFilter);
    }

    // Search filter
    if (search) {
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(lowerSearch) ||
          i.notes.toLowerCase().includes(lowerSearch) ||
          i.category.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort within each group
    if (sortKey !== 'category') {
      filtered = [...filtered].sort((a, b) => {
        switch (sortKey) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'status': {
            const order = { have: 0, wanted: 1, ordered: 2 };
            return (order[a.status] ?? 0) - (order[b.status] ?? 0);
          }
          case 'added':
            return (b.added ?? '').localeCompare(a.added ?? '');
          default:
            return 0;
        }
      });
    }

    const grouped: Record<string, typeof items> = {};
    for (const cat of EQUIPMENT_CATEGORIES) {
      const catItems = filtered.filter((i) => i.category === cat);
      if (catItems.length > 0) grouped[cat] = catItems;
    }
    return grouped;
  }, [items, search, statusFilter, sortKey]);

  // All visible item IDs (for select all)
  const visibleItemIds = useMemo(() => {
    return Object.values(filteredByCategory).flat().map((i) => i.id);
  }, [filteredByCategory]);

  // --- Select mode handlers ---
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => setSelectedIds(new Set(visibleItemIds));
  const deselectAll = () => setSelectedIds(new Set());

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkStatus = (status: 'have' | 'wanted' | 'ordered') => {
    const ids = Array.from(selectedIds);
    bulkUpdateStatus(ids, status);
    showToast('success', `Updated ${ids.length} items to "${status}"`);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    bulkDelete(ids);
    showToast('success', `Deleted ${ids.length} items`);
    setSelectedIds(new Set());
  };

  // --- Shopping list ---
  const wantedCount = stats.wanted;

  const handleShoppingListHTML = () => {
    exportShoppingListHTML(items);
    showToast('success', `Opened shopping list with ${wantedCount} wanted items`);
  };

  const handleShoppingListCSV = () => {
    exportShoppingListCSV(items);
    showToast('success', `Downloaded shopping list CSV with ${wantedCount} wanted items`);
  };

  // --- Export / Import handlers (existing) ---
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
      {/* Header row */}
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

          {/* Shopping List dropdown */}
          {wantedCount > 0 && (
            <div className="relative group">
              <button className="px-3 py-1 border border-threat-yellow/50 rounded text-xs text-threat-yellow hover:bg-threat-yellow/10 transition-colors cursor-pointer">
                Shopping List ({wantedCount})
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button onClick={handleShoppingListHTML} className="w-full text-left px-3 py-2 text-xs text-text-dim hover:text-text-primary hover:bg-surface-2 cursor-pointer">
                  Open printable list
                </button>
                <button onClick={handleShoppingListCSV} className="w-full text-left px-3 py-2 text-xs text-text-dim hover:text-text-primary hover:bg-surface-2 cursor-pointer">
                  Download as CSV
                </button>
              </div>
            </div>
          )}

          {/* Export dropdown */}
          <div className="relative group">
            <button
              className="px-3 py-1 border border-border rounded text-xs text-text-dim hover:text-text-primary hover:border-accent-2 transition-colors cursor-pointer"
            >
              Export &#9662;
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

          {/* Import toggle */}
          <button
            onClick={() => setShowImportPanel(!showImportPanel)}
            className={`px-3 py-1 border rounded text-xs transition-colors cursor-pointer ${
              showImportPanel
                ? 'border-accent text-accent bg-accent/10'
                : 'border-border text-text-dim hover:text-text-primary hover:border-accent-2'
            }`}
          >
            Import &#9662;
          </button>

          {/* Select Mode toggle */}
          <button
            onClick={selectMode ? exitSelectMode : () => setSelectMode(true)}
            className={`px-3 py-1 border rounded text-xs transition-colors cursor-pointer ${
              selectMode
                ? 'border-accent text-accent bg-accent/10'
                : 'border-border text-text-dim hover:text-text-primary hover:border-accent-2'
            }`}
          >
            {selectMode ? 'Exit Select' : 'Select Mode'}
          </button>
        </div>
      </div>

      {/* Bulk Action Bar (sticky) */}
      {selectMode && (
        <div className="sticky top-0 z-20 bg-surface border border-accent/30 rounded-lg p-3 mb-4 flex items-center gap-3 flex-wrap animate-fade-in">
          <span className="text-xs text-text-primary font-semibold">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <span className="text-[11px] text-text-dim">Mark as:</span>
          <button
            onClick={() => handleBulkStatus('have')}
            disabled={selectedIds.size === 0}
            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-threat-green/15 text-threat-green border border-threat-green/30 hover:bg-threat-green/25 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Have
          </button>
          <button
            onClick={() => handleBulkStatus('wanted')}
            disabled={selectedIds.size === 0}
            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-threat-yellow/15 text-threat-yellow border border-threat-yellow/30 hover:bg-threat-yellow/25 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Wanted
          </button>
          <button
            onClick={() => handleBulkStatus('ordered')}
            disabled={selectedIds.size === 0}
            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-accent-2/15 text-accent-2 border border-accent-2/30 hover:bg-accent-2/25 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Ordered
          </button>
          <div className="h-4 w-px bg-border" />
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-threat-red/15 text-threat-red border border-threat-red/30 hover:bg-threat-red/25 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Delete
          </button>
          <div className="flex-1" />
          <button
            onClick={selectAll}
            className="text-[11px] text-accent hover:underline cursor-pointer"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="text-[11px] text-text-dim hover:underline cursor-pointer"
          >
            Deselect All
          </button>
        </div>
      )}

      {/* Stats Bar */}
      {items.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-3 mb-4 animate-fade-in">
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <span className="text-text-dim">
              Total: <span className="text-text-primary font-semibold">{stats.total}</span>
            </span>
            <span className="text-threat-green">
              Have: <span className="font-semibold">{stats.have}</span>
            </span>
            <span className="text-threat-yellow">
              Wanted: <span className="font-semibold">{stats.wanted}</span>
            </span>
            <span className="text-accent-2">
              Ordered: <span className="font-semibold">{stats.ordered}</span>
            </span>
            <span className="text-text-dim">
              Categories: <span className="text-text-primary font-semibold">{stats.categoriesUsed}/{stats.totalCategories}</span>
            </span>
            <div className="flex-1 min-w-[120px] flex items-center gap-2">
              <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-threat-green rounded-full transition-all duration-500"
                  style={{ width: `${stats.pct}%` }}
                />
              </div>
              <span className="text-[11px] text-threat-green font-semibold whitespace-nowrap">{stats.pct}% ready</span>
            </div>
          </div>
        </div>
      )}

      {/* Import Panel */}
      {showImportPanel && (
        <div className="bg-surface border border-accent/30 rounded-lg p-4 mb-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Import Equipment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <button
              onClick={handleLoadStarterKit}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-surface-2 hover:border-threat-green hover:bg-threat-green/5 transition-all cursor-pointer text-center"
            >
              <span className="text-2xl">&#127890;</span>
              <span className="text-xs font-semibold text-text-primary">Load Starter Kit</span>
              <span className="text-[10px] text-text-dim">40+ recommended items for a complete 72-hour bugout bag</span>
            </button>

            <button
              onClick={() => handleImportFile('merge')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-surface-2 hover:border-accent-2 hover:bg-accent-2/5 transition-all cursor-pointer text-center"
            >
              <span className="text-2xl">&#128196;</span>
              <span className="text-xs font-semibold text-text-primary">Import File (Merge)</span>
              <span className="text-[10px] text-text-dim">Add items from CSV or JSON — skips duplicates, keeps existing items</span>
            </button>

            <button
              onClick={() => handleImportFile('replace')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-surface-2 hover:border-threat-red hover:bg-threat-red/5 transition-all cursor-pointer text-center"
            >
              <span className="text-2xl">&#128260;</span>
              <span className="text-xs font-semibold text-text-primary">Import File (Replace)</span>
              <span className="text-[10px] text-text-dim">Replace ALL items with imported file — use for full inventory swap</span>
            </button>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <button
              onClick={handleDownloadTemplate}
              className="text-[11px] text-accent-2 hover:underline cursor-pointer"
            >
              &#128229; Download CSV template
            </button>
            <span className="text-[10px] text-text-dim">Accepted formats: .csv, .json, .txt</span>
          </div>
        </div>
      )}

      {/* Add Item Form */}
      <div className="bg-surface border border-border rounded-lg p-4 mb-4">
        <AddItemForm />
      </div>

      {/* Filter / Sort / Search Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="max-w-sm flex-1 min-w-[180px]">
          <EquipmentSearchBar value={search} onChange={setSearch} />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-[0.68rem] text-text-dim uppercase tracking-wider">Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-surface-2 border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer"
          >
            <option value="all">All</option>
            <option value="have">Have</option>
            <option value="wanted">Wanted</option>
            <option value="ordered">Ordered</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-[0.68rem] text-text-dim uppercase tracking-wider">Sort:</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-surface-2 border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer"
          >
            <option value="category">Category</option>
            <option value="name">Name</option>
            <option value="status">Status</option>
            <option value="added">Date Added</option>
          </select>
        </div>
      </div>

      {/* Category Sections */}
      {Object.keys(filteredByCategory).length === 0 ? (
        <div className="text-center py-12 text-text-dim">
          <div className="text-3xl mb-2">&#127890;</div>
          <div className="text-sm">
            {search || statusFilter !== 'all' ? 'No items match your filters' : 'No equipment added yet. Use the form above to add items.'}
          </div>
        </div>
      ) : (
        Object.entries(filteredByCategory).map(([cat, catItems]) => (
          <CategorySection
            key={cat}
            category={cat}
            items={catItems}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        ))
      )}
    </div>
  );
}
