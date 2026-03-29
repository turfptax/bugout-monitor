export interface EquipmentItem {
  id: string;
  name: string;
  qty: string;
  category: string;
  notes: string;
  added?: string;
}

export const EQUIPMENT_CATEGORIES = [
  'Carry & Transport',
  'Communications',
  'Shelter & Warmth',
  'Fire & Cooking',
  'Water',
  'Tools & Blades',
  'Power',
  'Detection & Optics',
  'EMP / Faraday Protection',
  'Light',
  'Food',
  'Navigation',
  'Cordage & Repair',
  'Medical & Hygiene',
  'Knowledge & Reference',
] as const;

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];
