import { useState } from 'react';
import { useEquipmentStore } from '../../store/useEquipmentStore';
import type { EquipmentItem } from '../../types/equipment';

interface Props {
  item: EquipmentItem;
}

export default function ItemRow({ item }: Props) {
  const editItem = useEquipmentStore((s) => s.editItem);
  const deleteItem = useEquipmentStore((s) => s.deleteItem);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const isUserAdded = !!item.added;

  const startEdit = (field: string, value: string) => {
    setEditing(field);
    setEditValue(value);
  };

  const commitEdit = () => {
    if (editing) {
      editItem(item.id, { [editing]: editValue });
      setEditing(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(null);
  };

  const renderCell = (field: string, value: string) => {
    if (editing === field) {
      return (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="w-full bg-surface border border-accent rounded px-1 py-0.5 text-sm text-text-primary focus:outline-none"
        />
      );
    }
    return (
      <span
        onDoubleClick={() => startEdit(field, value)}
        className="cursor-text"
      >
        {value || '\u2014'}
      </span>
    );
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'wanted': return <span className="text-[10px] px-1.5 py-0.5 rounded bg-threat-yellow/15 text-threat-yellow border border-threat-yellow/30 font-semibold cursor-pointer" onClick={() => cycleStatus()} title="Click to change">🎯 WANTED</span>;
      case 'ordered': return <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-2/15 text-accent-2 border border-accent-2/30 font-semibold cursor-pointer" onClick={() => cycleStatus()} title="Click to change">📦 ORDERED</span>;
      default: return <span className="text-[10px] px-1.5 py-0.5 rounded bg-threat-green/15 text-threat-green border border-threat-green/30 font-semibold cursor-pointer" onClick={() => cycleStatus()} title="Click to change">✅ HAVE</span>;
    }
  };

  const cycleStatus = () => {
    const order: Array<'have' | 'wanted' | 'ordered'> = ['have', 'wanted', 'ordered'];
    const current = order.indexOf(item.status || 'have');
    const next = order[(current + 1) % order.length];
    editItem(item.id, { status: next });
  };

  return (
    <tr className={`text-sm hover:bg-accent/[0.04] transition-colors group ${item.status === 'wanted' ? 'opacity-75' : ''}`}>
      <td className="py-1.5 px-3 border border-border" style={isUserAdded ? { borderLeft: `3px solid ${item.status === 'wanted' ? '#d29922' : item.status === 'ordered' ? '#58a6ff' : '#58a6ff'}` } : {}}>
        <div className="flex items-center gap-1.5">
          {isUserAdded && <span className="text-accent-2 text-xs" title="User added">&#9733;</span>}
          {renderCell('name', item.name)}
        </div>
      </td>
      <td className="py-1.5 px-3 border border-border text-center w-16">
        {renderCell('qty', item.qty)}
      </td>
      <td className="py-1.5 px-3 border border-border w-24 text-center">
        {statusBadge(item.status || 'have')}
      </td>
      <td className="py-1.5 px-3 border border-border">
        {renderCell('notes', item.notes)}
      </td>
      {isUserAdded && (
        <td className="py-1.5 px-2 border border-border w-10">
          <button
            onClick={() => deleteItem(item.id)}
            className="text-threat-red hover:text-threat-extreme text-xs cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete item"
          >
            &#10005;
          </button>
        </td>
      )}
    </tr>
  );
}
