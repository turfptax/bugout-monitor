import type { EquipmentItem } from '../types/equipment';
import { EQUIPMENT_CATEGORIES } from '../types/equipment';

function groupWantedByCategory(items: EquipmentItem[]): Record<string, EquipmentItem[]> {
  const wanted = items.filter((i) => i.status === 'wanted');
  const grouped: Record<string, EquipmentItem[]> = {};
  for (const cat of EQUIPMENT_CATEGORIES) {
    const catItems = wanted.filter((i) => i.category === cat);
    if (catItems.length > 0) grouped[cat] = catItems;
  }
  return grouped;
}

export function exportShoppingListHTML(items: EquipmentItem[]): void {
  const grouped = groupWantedByCategory(items);
  const totalItems = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const categoryBlocks = Object.entries(grouped)
    .map(
      ([cat, catItems]) => `
      <div class="category">
        <h2>${cat}</h2>
        ${catItems
          .map(
            (item) => `
          <div class="item">
            <span class="checkbox">&#9744;</span>
            <span class="name">${escapeHtml(item.name)}</span>
            <span class="qty">(qty: ${escapeHtml(item.qty)})</span>
            ${item.notes ? `<span class="notes">— ${escapeHtml(item.notes)}</span>` : ''}
          </div>`
          )
          .join('')}
      </div>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Bugout Shopping List</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      max-width: 700px;
      margin: 0 auto;
      padding: 40px 24px;
      color: #1a1a1a;
      background: #fff;
    }
    h1 {
      font-size: 22px;
      text-transform: uppercase;
      letter-spacing: 2px;
      border-bottom: 2px solid #333;
      padding-bottom: 8px;
      margin-bottom: 4px;
    }
    .date { font-size: 12px; color: #666; margin-bottom: 28px; }
    .category { margin-bottom: 20px; }
    .category h2 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #444;
      border-bottom: 1px solid #ddd;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .item {
      padding: 4px 0 4px 8px;
      font-size: 14px;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .checkbox { font-size: 16px; }
    .name { font-weight: 600; }
    .qty { color: #666; font-size: 13px; }
    .notes { color: #888; font-size: 12px; font-style: italic; }
    .total {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 2px solid #333;
      font-size: 14px;
      font-weight: 600;
    }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <h1>Bugout Shopping List</h1>
  <div class="date">Generated: ${date}</div>
  ${categoryBlocks}
  <div class="total">Total items needed: ${totalItems}</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export function exportShoppingListCSV(items: EquipmentItem[]): void {
  const wanted = items.filter((i) => i.status === 'wanted');
  const rows = [['Category', 'Item', 'Qty', 'Notes']];
  for (const cat of EQUIPMENT_CATEGORIES) {
    const catItems = wanted.filter((i) => i.category === cat);
    for (const item of catItems) {
      rows.push([item.category, item.name, item.qty, item.notes]);
    }
  }
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bugout-shopping-list-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
