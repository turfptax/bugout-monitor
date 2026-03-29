import type { EquipmentItem } from '../types/equipment';
import { EQUIPMENT_CATEGORIES } from '../types/equipment';

/**
 * Parse a CSV string into equipment items.
 * Handles quoted fields, commas inside quotes, and various line endings.
 * Expected columns: name, qty, category, notes (header row required)
 */
export function parseCSV(text: string): EquipmentItem[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const nameIdx = header.findIndex(h => h === 'name' || h === 'item' || h === 'item name');
  const qtyIdx = header.findIndex(h => h === 'qty' || h === 'quantity' || h === 'count');
  const catIdx = header.findIndex(h => h === 'category' || h === 'cat' || h === 'type');
  const notesIdx = header.findIndex(h => h === 'notes' || h === 'note' || h === 'description');

  if (nameIdx === -1) {
    throw new Error('CSV must have a "name" column. Expected headers: name, qty, category, notes');
  }

  const items: EquipmentItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    const name = fields[nameIdx]?.trim();
    if (!name) continue;

    // Skip example rows
    if (name.toLowerCase().startsWith('example:')) continue;

    const qty = qtyIdx >= 0 ? (fields[qtyIdx]?.trim() || '1') : '1';
    const rawCategory = catIdx >= 0 ? fields[catIdx]?.trim() : '';
    const notes = notesIdx >= 0 ? (fields[notesIdx]?.trim() || '') : '';

    // Fuzzy match category
    const category = matchCategory(rawCategory);

    items.push({
      id: crypto.randomUUID(),
      name,
      qty,
      category,
      notes,
      added: new Date().toISOString(),
    });
  }

  return items;
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Fuzzy match a category string to one of the valid categories.
 */
function matchCategory(raw: string): string {
  if (!raw) return 'Carry & Transport';

  const lower = raw.toLowerCase();

  // Exact match first
  for (const cat of EQUIPMENT_CATEGORIES) {
    if (cat.toLowerCase() === lower) return cat;
  }

  // Partial match
  for (const cat of EQUIPMENT_CATEGORIES) {
    if (cat.toLowerCase().includes(lower) || lower.includes(cat.toLowerCase())) return cat;
  }

  // Keyword matching
  const keywords: Record<string, string> = {
    'radio': 'Communications',
    'comms': 'Communications',
    'walkie': 'Communications',
    'meshtastic': 'Communications',
    'antenna': 'Communications',
    'tent': 'Shelter & Warmth',
    'sleeping': 'Shelter & Warmth',
    'blanket': 'Shelter & Warmth',
    'tarp': 'Shelter & Warmth',
    'stove': 'Fire & Cooking',
    'fire': 'Fire & Cooking',
    'lighter': 'Fire & Cooking',
    'cook': 'Fire & Cooking',
    'water': 'Water',
    'filter': 'Water',
    'purif': 'Water',
    'lifestraw': 'Water',
    'knife': 'Tools & Blades',
    'axe': 'Tools & Blades',
    'saw': 'Tools & Blades',
    'tool': 'Tools & Blades',
    'solar': 'Power',
    'battery': 'Power',
    'charger': 'Power',
    'power': 'Power',
    'panel': 'Power',
    'geiger': 'Detection & Optics',
    'binocular': 'Detection & Optics',
    'scope': 'Detection & Optics',
    'faraday': 'EMP / Faraday Protection',
    'emp': 'EMP / Faraday Protection',
    'flashlight': 'Light',
    'headlamp': 'Light',
    'lantern': 'Light',
    'candle': 'Light',
    'food': 'Food',
    'meal': 'Food',
    'bar': 'Food',
    'rice': 'Food',
    'map': 'Navigation',
    'compass': 'Navigation',
    'gps': 'Navigation',
    'rope': 'Cordage & Repair',
    'cord': 'Cordage & Repair',
    'tape': 'Cordage & Repair',
    'paracord': 'Cordage & Repair',
    'medical': 'Medical & Hygiene',
    'first aid': 'Medical & Hygiene',
    'ifak': 'Medical & Hygiene',
    'bandage': 'Medical & Hygiene',
    'medicine': 'Medical & Hygiene',
    'antibiotic': 'Medical & Hygiene',
    'hygiene': 'Medical & Hygiene',
    'towel': 'Medical & Hygiene',
    'book': 'Knowledge & Reference',
    'manual': 'Knowledge & Reference',
    'guide': 'Knowledge & Reference',
    'backpack': 'Carry & Transport',
    'bag': 'Carry & Transport',
    'case': 'Carry & Transport',
    'wagon': 'Carry & Transport',
  };

  for (const [keyword, cat] of Object.entries(keywords)) {
    if (lower.includes(keyword)) return cat;
  }

  return 'Carry & Transport'; // default
}

/**
 * Parse a JSON file into equipment items.
 * Accepts both array format and {items: [...]} format.
 */
export function parseJSON(text: string): EquipmentItem[] {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data.items;
  if (!Array.isArray(arr)) {
    throw new Error('JSON must be an array of items or have an "items" field');
  }

  return arr.map((item: Record<string, string>) => ({
    id: item.id || crypto.randomUUID(),
    name: item.name || 'Unknown Item',
    qty: String(item.qty || item.quantity || '1'),
    category: matchCategory(item.category || item.type || ''),
    notes: item.notes || item.description || item.note || '',
    added: item.added || new Date().toISOString(),
  }));
}

/**
 * Generate a CSV string from equipment items for export.
 */
export function toCSV(items: EquipmentItem[]): string {
  const header = 'name,qty,category,notes';
  const rows = items.map(i => {
    const esc = (s: string) => s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
    return `${esc(i.name)},${esc(i.qty)},${esc(i.category)},${esc(i.notes)}`;
  });
  return [header, ...rows].join('\n');
}
