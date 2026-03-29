import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import PlanSidebar, { sections } from './PlanSidebar';
import RallyPointRow from './RallyPointRow';
import HelpIcon from '../layout/HelpIcon';

const RouteMap = lazy(() => import('./RouteMap'));
import { useEquipmentStore } from '../../store/useEquipmentStore';
import { useThreatStore } from '../../store/useThreatStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { EQUIPMENT_CATEGORIES } from '../../types/equipment';
import type { EquipmentItem } from '../../types/equipment';

// ── localStorage helpers ──

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    // Deep merge with fallback so missing fields get defaults
    if (typeof fallback === 'object' && fallback !== null && !Array.isArray(fallback)) {
      return { ...fallback, ...parsed } as T;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Editable cell component for tables ──

function EditableCell({
  value: rawValue,
  placeholder,
  onChange,
  className = '',
}: {
  value: string | undefined | null;
  placeholder: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const value = rawValue ?? '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    onChange(draft ?? '');
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft ?? ''}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className="w-full bg-surface border border-accent rounded px-2 py-1 text-sm text-text-primary focus:outline-none"
      />
    );
  }

  const hasValue = (value ?? '').trim().length > 0;
  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`cursor-pointer ${hasValue ? 'text-text-primary' : 'text-text-dim italic'} ${className}`}
    >
      {hasValue ? value : placeholder}
    </span>
  );
}

// ── Gap analysis logic (mirrors chatTools.ts executeSuggestGaps) ──

const RECOMMENDED: Record<string, string[]> = {
  'Water': ['water filter', 'water container', 'purification tablets'],
  'Food': ['freeze-dried meals', 'energy bars'],
  'Shelter & Warmth': ['tent', 'sleeping bag'],
  'Fire & Cooking': ['fire starter', 'stove', 'cookware'],
  'Communications': ['radio', 'walkie-talkie', 'hand-crank radio'],
  'Medical & Hygiene': ['first aid kit', 'pain relief', 'tourniquet'],
  'Navigation': ['map', 'compass'],
  'Light': ['headlamp', 'flashlight'],
  'Power': ['solar panel', 'power bank'],
  'Tools & Blades': ['knife', 'multi-tool'],
  'Cordage & Repair': ['paracord', 'duct tape'],
  'Knowledge & Reference': ['survival manual'],
  'Carry & Transport': ['backpack'],
  'Detection & Optics': ['binoculars'],
  'EMP / Faraday Protection': ['faraday bag'],
};

function computeGaps(items: EquipmentItem[]) {
  const categories: Record<string, string[]> = {};
  items.forEach((i) => {
    if (!categories[i.category]) categories[i.category] = [];
    categories[i.category].push(i.name.toLowerCase());
  });

  const results: { category: string; covered: boolean; missing: string[] }[] = [];
  for (const [cat, recs] of Object.entries(RECOMMENDED)) {
    const catItems = categories[cat] || [];
    const missing = recs.filter(
      (rec) => !catItems.some((item) => item.includes(rec) || rec.split(' ').some((w) => item.includes(w)))
    );
    results.push({ category: cat, covered: missing.length === 0, missing });
  }
  return results;
}

// ── Scenario gear checks (mirrors chatTools.ts executeGetScenarioPlan) ──

interface ScenarioDef {
  id: string;
  name: string;
  icon: string;
  triggerSummary: string;
  actionSummary: string;
  timeframe: string;
  gearChecks: { label: string; test: (names: string[]) => boolean }[];
}

const SCENARIOS: ScenarioDef[] = [
  {
    id: 'nuclear',
    name: 'Nuclear Event',
    icon: '\u2622',
    triggerSummary: 'Flash/EBS alert, mushroom cloud visible toward Omaha, or Geiger counter spiking.',
    actionSummary: 'Shelter in basement 24-48 hrs to avoid initial fallout. Then evacuate NW on Route Alpha. Monitor Geiger counter. Seal windows with plastic and tape.',
    timeframe: 'Shelter 24-48 hrs, then evacuate NW',
    gearChecks: [
      { label: 'Geiger counter', test: (n) => n.some((x) => x.includes('geiger') || x.includes('radiation')) },
      { label: 'Radio (NOAA)', test: (n) => n.some((x) => x.includes('radio') || x.includes('uv-5r') || x.includes('baofeng')) },
      { label: 'Faraday bags', test: (n) => n.some((x) => x.includes('faraday')) },
      { label: 'Meshtastic', test: (n) => n.some((x) => x.includes('meshtastic') || x.includes('lora')) },
      { label: 'Water filter', test: (n) => n.some((x) => x.includes('lifestraw') || x.includes('water filter')) },
    ],
  },
  {
    id: 'emp',
    name: 'EMP / Carrington Event',
    icon: '\u26A1',
    triggerSummary: 'Widespread power failure, electronics dead, no cell/internet, vehicles potentially disabled.',
    actionSummary: 'Shelter in place 1-3 days to assess scope. Fill all water containers immediately. Retrieve Faraday-protected electronics. If grid stays down past 72 hrs, bug out.',
    timeframe: 'Shelter 1-3 days, then evaluate',
    gearChecks: [
      { label: 'Faraday bags', test: (n) => n.some((x) => x.includes('faraday')) },
      { label: 'Solar panel', test: (n) => n.some((x) => x.includes('solar panel') || x.includes('solar charger')) },
      { label: 'Radio', test: (n) => n.some((x) => x.includes('radio') || x.includes('uv-5r')) },
      { label: 'Hand-crank radio', test: (n) => n.some((x) => x.includes('crank') || x.includes('hand-crank')) },
      { label: 'Power bank', test: (n) => n.some((x) => x.includes('power bank')) },
    ],
  },
  {
    id: 'tornado',
    name: 'Tornado / Severe Storm',
    icon: '\uD83C\uDF2A\uFE0F',
    triggerSummary: 'Tornado warning, severe weather alerts, visible funnel cloud.',
    actionSummary: 'Shelter in basement/interior room during storm. If home destroyed, deploy survival tents. Await emergency services. Bug out only if infrastructure catastrophically damaged.',
    timeframe: 'Shelter during event; reassess after',
    gearChecks: [
      { label: 'Weather radio', test: (n) => n.some((x) => x.includes('crank') || x.includes('noaa') || x.includes('weather radio')) },
      { label: 'Survival tent', test: (n) => n.some((x) => x.includes('tent') || x.includes('shelter')) },
      { label: 'First aid', test: (n) => n.some((x) => x.includes('first aid') || x.includes('medical') || x.includes('ifak')) },
      { label: 'Flashlight/headlamp', test: (n) => n.some((x) => x.includes('headlamp') || x.includes('flashlight') || x.includes('light')) },
    ],
  },
  {
    id: 'civil_unrest',
    name: 'Civil Unrest',
    icon: '\u2694\uFE0F',
    triggerSummary: 'Sustained rioting, supply chains halted, law enforcement overwhelmed.',
    actionSummary: 'Low profile. Avoid downtown. Use Meshtastic for silent encrypted comms. If violence approaches, bug out via Route Bravo (avoids Omaha). Travel at night.',
    timeframe: 'Bug out when threat reaches your area',
    gearChecks: [
      { label: 'Meshtastic (encrypted)', test: (n) => n.some((x) => x.includes('meshtastic') || x.includes('lora')) },
      { label: 'Radio', test: (n) => n.some((x) => x.includes('radio') || x.includes('uv-5r')) },
      { label: 'Backpack', test: (n) => n.some((x) => x.includes('backpack') || x.includes('caluomatt')) },
      { label: 'Navigation', test: (n) => n.some((x) => x.includes('map') || x.includes('compass')) },
    ],
  },
  {
    id: 'food_shortage',
    name: 'Food / Supply Shortage',
    icon: '\uD83C\uDF5A',
    triggerSummary: 'Grocery shelves empty 3+ days, no resupply expected.',
    actionSummary: 'Ration stored food. Cook rice with rocket stove. Shelter in place up to 6-8 weeks on reserves. Bug out toward agricultural rural areas if water becomes scarce.',
    timeframe: 'Shelter up to 6-8 weeks, then evaluate',
    gearChecks: [
      { label: 'Food reserves', test: (n) => n.some((x) => x.includes('rice') || x.includes('food') || x.includes('meal') || x.includes('bar')) },
      { label: 'Rocket stove', test: (n) => n.some((x) => x.includes('rocket stove') || x.includes('stove')) },
      { label: 'Water filter', test: (n) => n.some((x) => x.includes('lifestraw') || x.includes('water filter')) },
      { label: 'Foraging guide', test: (n) => n.some((x) => x.includes('foraging') || x.includes('edible')) },
    ],
  },
  {
    id: 'power_outage',
    name: 'Extended Power Outage',
    icon: '\uD83D\uDD0B',
    triggerSummary: 'Ice storm or grid failure; no heat in sub-zero temps.',
    actionSummary: 'Insulate one room, use sleeping bags/thermal blankets. Rocket stove for heat (with ventilation!). Melt snow for water. If outage extends past 5-7 days in deep winter, bug out south.',
    timeframe: 'Shelter up to 1 week; bug out if worsening',
    gearChecks: [
      { label: 'Solar panel', test: (n) => n.some((x) => x.includes('solar')) },
      { label: 'Power bank', test: (n) => n.some((x) => x.includes('power bank')) },
      { label: 'Rocket stove', test: (n) => n.some((x) => x.includes('rocket stove') || x.includes('stove')) },
      { label: 'Tealight candles', test: (n) => n.some((x) => x.includes('tealight') || x.includes('candle')) },
      { label: 'Hand-crank radio', test: (n) => n.some((x) => x.includes('crank')) },
    ],
  },
];

// ── Comms tiers ──

interface CommsTier {
  tier: number;
  name: string;
  device: string;
  capability: string;
  rangeNote: string;
  fieldKey?: string; // key in comms localStorage for configured value
}

const COMMS_TIERS: CommsTier[] = [
  { tier: 1, name: 'Meshtastic LoRa', device: 'Wio Tracker L1 (x2) + ESP32 relay', capability: 'Encrypted text + GPS position sharing', rangeNote: '1-5 mi urban, 10+ mi LOS', fieldKey: 'meshtasticChannel' },
  { tier: 2, name: 'Baofeng UV-5R', device: 'Dual-band VHF/UHF (x2)', capability: 'Primary voice comms', rangeNote: '5-10 mi (urban), 10-20 mi (open)', fieldKey: 'primaryFrequency' },
  { tier: 3, name: 'Baofeng F22 FRS', device: 'FRS walkie-talkie (x2)', capability: 'Backup voice, simple operation', rangeNote: '1-2 mi', fieldKey: 'frsChannel' },
  { tier: 4, name: 'Pixel Watch LTE', device: 'Pixel Watch 3 41mm (LTE)', capability: 'Cell-dependent calls/texts', rangeNote: 'Cell tower dependent' },
  { tier: 5, name: 'Hand-Crank Radio', device: 'Emergency radio (x2)', capability: 'AM/FM/NOAA receive only', rangeNote: 'Broadcast range' },
];

// ── Default route/comms/shelter/contacts structures ──

interface RouteData {
  name: string;
  path: string;
  distance: string;
  destination: string;
  waypoints: string;
  notes: string;
}

interface CommsData {
  primaryFrequency: string;
  backupFrequency: string;
  frsChannel: string;
  meshtasticChannel: string;
  outOfStateContact: string;
  codeWords: Record<string, string>;
  [key: string]: unknown;
}

interface ShelterData {
  foodDays: number | null;
  waterGallons: number | null;
  tripwires: string[];
  notes: string;
}

interface ContactsData {
  ice1: string;
  ice2: string;
  neighbor: string;
  outOfState: string;
  [key: string]: string;
}

const DEFAULT_COMMS: CommsData = {
  primaryFrequency: '',
  backupFrequency: '',
  frsChannel: '',
  meshtasticChannel: '',
  outOfStateContact: '',
  codeWords: {},
};

const DEFAULT_SHELTER: ShelterData = {
  foodDays: null,
  waterGallons: null,
  tripwires: [],
  notes: '',
};

// ── Threat level color helper ──

function threatColor(level: number): string {
  if (level <= 3) return 'text-threat-green';
  if (level <= 6) return 'text-threat-yellow';
  if (level <= 8) return 'text-threat-red';
  return 'text-threat-extreme';
}

function threatBg(level: number): string {
  if (level <= 3) return 'bg-threat-green/10 border-threat-green/30';
  if (level <= 6) return 'bg-threat-yellow/10 border-threat-yellow/30';
  if (level <= 8) return 'bg-threat-red/10 border-threat-red/30';
  return 'bg-threat-extreme/10 border-threat-extreme/30';
}

// ── Bag loadout definitions ──

interface LoadoutSection {
  compartment: string;
  items: string[];
}

const BAG1_LOADOUT: LoadoutSection[] = [
  { compartment: 'Main', items: ['72-hr food rations', 'Silverware/utensil kit', 'Collapsible bucket (1x 20L)', 'Extra clothing layer', 'Rain poncho'] },
  { compartment: 'Secondary', items: ['Survival tent #1', 'Fire starter #1', 'Rocket stove', 'Chain saw #1', 'Hatchet multitool'] },
  { compartment: 'Top/Admin', items: ['Nat Geo map + NE road maps + compass', 'Mossy Oak knife #1', 'Headlamp', 'Binoculars', 'UV-5R radio #1', 'Meshtastic Wio Tracker #1'] },
  { compartment: 'MOLLE Exterior', items: ['Water bottle + LifeStraw #1', '40W solar panel (clipped to charge while walking)'] },
  { compartment: 'MOLLE Side Pouches', items: ['Hand-crank radio', 'Second Baofeng radio', 'Nursing scissors/multitool', 'Compressed towel tablets'] },
  { compartment: 'Hip Belt', items: ['Cash (half)', 'Lighter (backup fire)', 'Snack bars', 'F22 walkie-talkie #1'] },
  { compartment: 'Side Pockets', items: ['US Army Survival Manual', 'Midwest Foraging book'] },
  { compartment: 'Internal (ziplock)', items: ['Battery-powered soldering iron', 'Digital multimeter', '12V car power inverter'] },
  { compartment: 'Wrist/Carried', items: ['Pixel Watch 3 41mm (LTE)', 'Durecopow 20K mAh power bank #1'] },
];

const BAG2_LOADOUT: LoadoutSection[] = [
  { compartment: 'Main', items: ['72-hr food rations', 'Cooking set (pots/pans)', 'Collapsible buckets (2x 5-gal)', 'Extra clothing layer', 'Rain poncho', 'Hygiene kit'] },
  { compartment: 'Secondary', items: ['15W solar panel', 'Paracord (100ft fire tinder)', 'Camping towels'] },
  { compartment: 'Top/Admin', items: ['IFAK / first aid kit', 'All medications', 'LifeStraw #2', 'Headlamp', 'UV-5R radio #2', 'Meshtastic Wio Tracker #2', 'Geiger counter'] },
  { compartment: 'MOLLE Exterior', items: ['Water bottle + LifeStraw #3'] },
  { compartment: 'MOLLE Side Pouches', items: ['Hand-crank radio', 'Second Baofeng radio', 'Nursing scissors/multitool', 'Survival tent #2', 'Chain saw #2', 'Compass', 'Compressed towels'] },
  { compartment: 'Hip Belt', items: ['Cash (half)', 'ID copies', 'Emergency contact card', 'F22 walkie-talkie #2'] },
  { compartment: 'Side Pockets', items: ['US Army Survival Manual #2', 'Mossy Oak knife #2', 'Nebraska road maps'] },
  { compartment: 'Internal (ziplock)', items: ['Medicine bag (antibiotic ointment, snack bars)', 'Fire starters'] },
  { compartment: 'Wrist/Carried', items: ['Pixel Watch 3 45mm (Wi-Fi)', 'Durecopow 20K mAh power bank #2'] },
];

// ── Go checklist items with equipment refs ──

interface GoItem {
  label: string;
  equipKeywords: string[]; // check inventory for these
}

const GO_CHECKLIST: GoItem[] = [
  { label: 'Both CALUOMATT backpacks (pre-packed, staged by door)', equipKeywords: ['caluomatt', 'backpack'] },
  { label: 'NANUK 935 case (Geiger, Meshtastic relay, documents)', equipKeywords: ['nanuk 935'] },
  { label: 'UV-5R radios on private frequency (one per person)', equipKeywords: ['uv-5r'] },
  { label: 'Meshtastic Wio Trackers powered on with GPS fix', equipKeywords: ['meshtastic', 'wio tracker'] },
  { label: 'Car keys, phones, wallets, Pixel Watches on wrists', equipKeywords: ['pixel watch'] },
  { label: 'Fill collapsible buckets with water (60 sec at tap)', equipKeywords: ['collapsible bucket', 'bucket'] },
  { label: 'Grab last medications from fridge/cabinet', equipKeywords: ['ibuprofen', 'acetaminophen', 'medication'] },
  { label: 'Load NANUK 962, wagon, and water into vehicle', equipKeywords: ['nanuk 962', 'wagon'] },
  { label: 'Confirm with spouse: route, destination, rally point', equipKeywords: [] },
  { label: 'Lock house and GO', equipKeywords: [] },
];

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════

export default function PlanTab() {
  const [activeSection, setActiveSection] = useState('threat');
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Zustand stores ──
  const equipmentItems = useEquipmentStore((s) => s.items);
  const threatData = useThreatStore((s) => s.data);
  const threatLoading = useThreatStore((s) => s.loading);
  const lastFetched = useThreatStore((s) => s.lastFetched);
  const location = useSettingsStore((s) => s.location);

  // ── localStorage state ──
  const [rallyPoints, setRallyPoints] = useState(() =>
    readJson('bugout-rally', { primary: '', secondary: '', outOfArea: '' })
  );
  const [routes, setRoutes] = useState<Record<string, RouteData>>(() =>
    readJson('bugout-routes', {})
  );
  const [comms, setComms] = useState<CommsData>(() => {
    const raw = readJson('bugout-comms', DEFAULT_COMMS);
    // Ensure codeWords is always an object
    return { ...DEFAULT_COMMS, ...raw, codeWords: { ...DEFAULT_COMMS.codeWords, ...(raw.codeWords || {}) } };
  });
  const [shelter, setShelter] = useState<ShelterData>(() => {
    const raw = readJson('bugout-shelter', DEFAULT_SHELTER);
    // Ensure tripwires is always an array
    return { ...DEFAULT_SHELTER, ...raw, tripwires: Array.isArray(raw.tripwires) ? raw.tripwires : [] };
  });
  const [contacts, setContacts] = useState<ContactsData>(() =>
    readJson('bugout-contacts', { ice1: '', ice2: '', neighbor: '', outOfState: '' })
  );
  const [goChecked, setGoChecked] = useState<Record<number, boolean>>({});

  // ── Persist helpers ──
  const updateRally = useCallback((key: string, value: string) => {
    setRallyPoints((prev: Record<string, string>) => {
      const next = { ...prev, [key]: value };
      writeJson('bugout-rally', next);
      return next;
    });
  }, []);

  const updateRoute = useCallback((routeId: string, field: string, value: string) => {
    setRoutes((prev) => {
      const existing = prev[routeId] || { name: '', path: '', distance: '', destination: '', waypoints: '', notes: '' };
      const next = { ...prev, [routeId]: { ...existing, [field]: value } };
      writeJson('bugout-routes', next);
      return next;
    });
  }, []);

  const updateComms = useCallback((field: string, value: unknown) => {
    setComms((prev) => {
      const next = { ...prev, [field]: value };
      writeJson('bugout-comms', next);
      return next;
    });
  }, []);

  const updateShelter = useCallback((field: string, value: unknown) => {
    setShelter((prev) => {
      const next = { ...prev, [field]: value };
      writeJson('bugout-shelter', next);
      return next;
    });
  }, []);

  const updateContacts = useCallback((field: string, value: string) => {
    setContacts((prev) => {
      const next = { ...prev, [field]: value };
      writeJson('bugout-contacts', next);
      return next;
    });
  }, []);

  // ── Derived data ──
  const itemNames = useMemo(() => equipmentItems.map((i) => i.name.toLowerCase()), [equipmentItems]);
  const haveItems = useMemo(() => equipmentItems.filter((i) => i.status === 'have' || !i.status), [equipmentItems]);
  const wantedItems = useMemo(() => equipmentItems.filter((i) => i.status === 'wanted'), [equipmentItems]);
  const orderedItems = useMemo(() => equipmentItems.filter((i) => i.status === 'ordered'), [equipmentItems]);
  const byCategory = useMemo(() => {
    const m: Record<string, EquipmentItem[]> = {};
    equipmentItems.forEach((i) => {
      if (!m[i.category]) m[i.category] = [];
      m[i.category].push(i);
    });
    return m;
  }, [equipmentItems]);
  const coveredCategories = useMemo(() => new Set(equipmentItems.map((i) => i.category)), [equipmentItems]);
  const gaps = useMemo(() => computeGaps(equipmentItems), [equipmentItems]);
  const totalGaps = useMemo(() => gaps.reduce((sum, g) => sum + g.missing.length, 0), [gaps]);

  // Shelter timeline estimate
  const shelterDays = useMemo(() => {
    if (shelter.foodDays && shelter.waterGallons) {
      const waterDays = Math.floor(shelter.waterGallons / 2); // ~1 gal/person/day, 2 people
      return Math.min(shelter.foodDays, waterDays);
    }
    return shelter.foodDays || null;
  }, [shelter]);

  // ── Section scroll / intersection ──
  const handleSectionClick = useCallback((id: string) => {
    const el = document.getElementById(`plan-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('plan-', '');
            setActiveSection(id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(`plan-${s.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // ── Helpers ──
  const SectionNumber = ({ n }: { n: number }) => (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent text-bg text-xs font-bold mr-2">
      {n}
    </span>
  );

  const assessment = threatData?.assessment;

  // Route definitions for display
  const routeIds = [
    { id: 'alpha', label: 'Route Alpha', sublabel: 'Primary' },
    { id: 'bravo', label: 'Route Bravo', sublabel: 'Alternate' },
    { id: 'charlie', label: 'Route Charlie', sublabel: 'On Foot' },
  ];

  // Helper: does the inventory have at least one item matching any of the keywords?
  const inventoryHas = (keywords: string[]): boolean => {
    if (keywords.length === 0) return false;
    return keywords.some((kw) => itemNames.some((n) => n.includes(kw.toLowerCase())));
  };

  // Helper: count matching items + representative qty
  const inventoryMatch = (keywords: string[]): { found: boolean; label: string } => {
    if (keywords.length === 0) return { found: false, label: '' };
    const matching = equipmentItems.filter((item) =>
      keywords.some((kw) => item.name.toLowerCase().includes(kw.toLowerCase()))
    );
    if (matching.length === 0) return { found: false, label: 'not in inventory' };
    const first = matching[0];
    const qtyInfo = matching.length === 1
      ? `${first.qty} in inventory`
      : `${matching.length} items in inventory`;
    return { found: true, label: qtyInfo };
  };

  return (
    <div className="flex">
      <PlanSidebar activeSection={activeSection} onSectionClick={handleSectionClick} />

      <div ref={contentRef} className="flex-1 px-4 md:px-8 lg:px-12 py-6 max-w-[900px]">

        {/* ═══════════════════════════════════════════ */}
        {/* 1. THREAT ASSESSMENT                       */}
        {/* ═══════════════════════════════════════════ */}
        <div id="plan-threat" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={1} /> Threat Assessment
          </h2>

          {location.city && location.state ? (
            <p className="text-sm text-text-dim mb-3">
              Location: <span className="text-text-primary font-medium">{location.city}, {location.state}</span>
              {(location.nearbyTargets || []).length > 0 && (
                <> &mdash; Nearby targets: <span className="text-threat-yellow">{(location.nearbyTargets || []).join(', ')}</span></>
              )}
            </p>
          ) : (
            <div className="bg-threat-red/10 border border-threat-red/30 rounded-md p-3 text-sm text-threat-red mb-3">
              Location not configured. Set your city and state in Settings to enable threat analysis.
            </div>
          )}

          {threatLoading && (
            <p className="text-sm text-text-dim animate-pulse">Loading threat data...</p>
          )}

          {!threatData && !threatLoading && (
            <div className="bg-surface border-l-3 border-threat-yellow rounded-r-md p-4 text-sm text-text-dim mb-4">
              <div className="font-bold text-xs uppercase tracking-wider text-threat-yellow mb-1">No Threat Data</div>
              Run the threat monitor to populate live threat levels. The Dashboard tab shows the full analysis.
            </div>
          )}

          {assessment && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Solar / Carrington', data: assessment.solar },
                  { label: 'Nuclear', data: assessment.nuclear },
                  { label: 'Weather', data: assessment.weather },
                  { label: 'Overall', data: assessment.overall },
                ].map(({ label, data }) => (
                  <div key={label} className={`border rounded-md p-3 ${threatBg(data.level)}`}>
                    <div className="text-[0.65rem] uppercase tracking-wider text-text-dim mb-1">{label}</div>
                    <div className={`text-2xl font-bold ${threatColor(data.level)}`}>
                      {data.level}<span className="text-sm font-normal text-text-dim">/10</span>
                    </div>
                    <div className={`text-xs font-medium ${threatColor(data.level)}`}>{data.label}</div>
                  </div>
                ))}
              </div>

              {assessment.diamond && (
                <div className="bg-surface border border-border rounded-md p-4 mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-threat-purple mb-2">
                    Diamond Collapse Index &mdash; {assessment.diamond.composite.level}/10 ({assessment.diamond.composite.label})
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {[
                      { label: 'Environmental', d: assessment.diamond.environmental },
                      { label: 'Climate', d: assessment.diamond.climate },
                      { label: 'Hostile', d: assessment.diamond.hostile },
                      { label: 'Trade/Supply', d: assessment.diamond.trade },
                      { label: 'Response', d: assessment.diamond.response },
                    ].map(({ label, d }) => (
                      <div key={label}>
                        <div className={`text-lg font-bold ${threatColor(d.level)}`}>{d.level}</div>
                        <div className="text-[0.6rem] text-text-dim">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-surface border-l-3 border-accent-2 rounded-r-md p-4 text-sm text-text-dim">
                <div className="font-bold text-xs uppercase tracking-wider text-accent-2 mb-1">Data Sources</div>
                NOAA SWPC, NASA DONKI, NWS Alerts, GDELT, Arms Control RSS, US Drought Monitor, FRED Economic Data
                {lastFetched && (
                  <span className="ml-2 text-text-dim">
                    &mdash; last updated {new Date(lastFetched).toLocaleString()}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* 2. DECISION FRAMEWORK                      */}
        {/* ═══════════════════════════════════════════ */}
        <div id="plan-decision" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={2} /> Decision Framework
          </h2>
          <p className="text-sm text-text-dim mb-3">
            Pre-defined decision triggers based on threat levels to remove emotion from emergency decisions.
          </p>

          <table className="w-full border-collapse text-sm mb-4">
            <thead>
              <tr>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider">Level</th>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {[
                { range: '1-3', label: 'Low', color: 'text-threat-green', min: 1, max: 3, action: 'Monitor. Maintain readiness. Review plan monthly.' },
                { range: '4-6', label: 'Elevated', color: 'text-threat-yellow', min: 4, max: 6, action: 'Alert family. Top off fuel, water, cash. Check bags are packed and staged.' },
                { range: '7-8', label: 'Severe', color: 'text-threat-red', min: 7, max: 8, action: 'Load vehicles. Activate comms plan. Stage at rally point. Confirm route.' },
                { range: '9-10', label: 'Extreme', color: 'text-threat-extreme', min: 9, max: 10, action: 'Execute bugout. Move to shelter location immediately.' },
              ].map((row) => {
                const overallLevel = assessment?.overall.level ?? 0;
                const isActive = overallLevel >= row.min && overallLevel <= row.max;
                return (
                  <tr key={row.range} className={isActive ? 'ring-2 ring-accent ring-inset' : ''}>
                    <td className={`px-3 py-1.5 border border-border font-semibold ${row.color}`}>
                      {row.range} ({row.label})
                      {isActive && (
                        <span className="ml-2 text-[0.65rem] bg-accent text-bg px-1.5 py-0.5 rounded-full uppercase font-bold">
                          Current
                        </span>
                      )}
                    </td>
                    <td className={`px-3 py-1.5 border border-border ${isActive ? 'text-text-primary font-medium' : 'text-text-dim'}`}>
                      {row.action}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="bg-surface border-l-3 border-accent rounded-r-md p-4 text-sm text-text-dim">
            <div className="font-bold text-xs uppercase tracking-wider text-accent mb-1">Rule of Thumb</div>
            When in doubt and you have a clear route, it is generally better to leave early than to wait too long.
            Leaving 6 hours ahead of everyone else is the difference between an easy drive and gridlocked highways.
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* 3. SCENARIO CARDS                          */}
        {/* ═══════════════════════════════════════════ */}
        <div id="plan-scenarios" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={3} /> Scenario Quick-Reference Cards
          </h2>
          <p className="text-sm text-text-dim mb-4">
            Each card shows the scenario trigger, recommended action, and whether your current inventory covers the critical gear.
          </p>

          <div className="space-y-4">
            {SCENARIOS.map((s) => {
              const allGood = s.gearChecks.every((g) => g.test(itemNames));
              return (
                <div key={s.id} className="bg-surface border border-border rounded-md overflow-hidden">
                  <div className={`flex items-center justify-between px-4 py-2.5 border-b border-border ${allGood ? 'bg-threat-green/5' : 'bg-threat-yellow/5'}`}>
                    <h4 className="text-sm font-semibold text-accent m-0">
                      <span className="mr-1.5">{s.icon}</span> {s.name}
                    </h4>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allGood ? 'bg-threat-green/15 text-threat-green' : 'bg-threat-yellow/15 text-threat-yellow'}`}>
                      {allGood ? 'Gear Ready' : 'Gaps Found'}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-text-dim mb-1">
                      <span className="font-bold text-text-primary uppercase tracking-wider">Trigger:</span> {s.triggerSummary}
                    </div>
                    <div className="text-xs text-text-dim mb-1">
                      <span className="font-bold text-text-primary uppercase tracking-wider">Action:</span> {s.actionSummary}
                    </div>
                    <div className="text-xs text-text-dim mb-3">
                      <span className="font-bold text-text-primary uppercase tracking-wider">Timeframe:</span> {s.timeframe}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {s.gearChecks.map((g) => {
                        const has = g.test(itemNames);
                        return (
                          <span key={g.label} className={`text-xs px-2 py-1 rounded border ${has ? 'border-threat-green/30 text-threat-green bg-threat-green/5' : 'border-threat-red/30 text-threat-red bg-threat-red/5'}`}>
                            {has ? '\u2705' : '\u274C'} {g.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* 4. EQUIPMENT INVENTORY                     */}
        {/* ═══════════════════════════════════════════ */}
        <div id="plan-inventory" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={4} /> Equipment Inventory
          </h2>

          {equipmentItems.length === 0 ? (
            <div className="bg-surface border-l-3 border-threat-yellow rounded-r-md p-4 text-sm text-text-dim">
              <div className="font-bold text-xs uppercase tracking-wider text-threat-yellow mb-1">No Equipment Logged</div>
              Head to the Equipment tab to add your gear. The AI assistant can also bulk-import items for you.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-surface border border-border rounded-md p-3 text-center">
                  <div className="text-2xl font-bold text-accent">{equipmentItems.length}</div>
                  <div className="text-xs text-text-dim">Total Items</div>
                </div>
                <div className="bg-surface border border-border rounded-md p-3 text-center">
                  <div className="text-2xl font-bold text-threat-green">{haveItems.length}</div>
                  <div className="text-xs text-text-dim">Have</div>
                </div>
                <div className="bg-surface border border-border rounded-md p-3 text-center">
                  <div className="text-2xl font-bold text-threat-yellow">{wantedItems.length}</div>
                  <div className="text-xs text-text-dim">Wanted</div>
                </div>
                <div className="bg-surface border border-border rounded-md p-3 text-center">
                  <div className="text-2xl font-bold text-threat-purple">{orderedItems.length}</div>
                  <div className="text-xs text-text-dim">Ordered</div>
                </div>
              </div>

              <div className="text-sm text-text-dim mb-3">
                Category coverage: <span className="text-text-primary font-medium">{coveredCategories.size}</span> / {EQUIPMENT_CATEGORIES.length}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {EQUIPMENT_CATEGORIES.map((cat) => {
                  const items = byCategory[cat];
                  const count = items?.length ?? 0;
                  return (
                    <div key={cat} className={`flex items-center justify-between px-3 py-1.5 rounded text-sm border ${count > 0 ? 'border-threat-green/20 bg-threat-green/5' : 'border-threat-red/20 bg-threat-red/5'}`}>
                      <span className={count > 0 ? 'text-text-primary' : 'text-threat-red'}>
                        {count > 0 ? '\u2705' : '\u274C'} {cat}
                      </span>
                      <span className="text-text-dim text-xs">{count} item{count !== 1 ? 's' : ''}</span>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-text-dim">
                Full inventory management is on the <span className="text-accent font-medium">Equipment</span> tab.
              </p>
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* 5. GAP ANALYSIS                            */}
        {/* ═══════════════════════════════════════════ */}
        <div id="plan-gaps" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={5} /> Gap Analysis
          </h2>
          <p className="text-sm text-text-dim mb-3">
            Checks your inventory against recommended items for a complete 72-hour bugout kit.
            {totalGaps === 0
              ? <span className="text-threat-green font-medium ml-1">All categories covered!</span>
              : <span className="text-threat-yellow font-medium ml-1">{totalGaps} gap{totalGaps !== 1 ? 's' : ''} found.</span>
            }
          </p>

          <table className="w-full border-collapse text-sm mb-4">
            <thead>
              <tr>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider">Category</th>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider w-[70px]">Status</th>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider">Missing</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((g) => (
                <tr key={g.category}>
                  <td className="px-3 py-1.5 border border-border text-text-primary font-medium">{g.category}</td>
                  <td className={`px-3 py-1.5 border border-border text-center font-bold ${g.covered ? 'text-threat-green' : 'text-threat-red'}`}>
                    {g.covered ? '\u2705' : '\u274C'}
                  </td>
                  <td className="px-3 py-1.5 border border-border text-text-dim text-xs">
                    {g.covered ? 'Covered' : g.missing.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* 6. BAG LOADOUT                             */}
        {/* ═══════════════════════════════════════════ */}
        <div id="plan-loadout" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={6} /> Bag Loadout Configuration
          </h2>
          <p className="text-sm text-text-dim mb-4">
            Each CALUOMATT 40-50L backpack should be packed and ready to grab at all times.
            Both people carry independent 72-hour survival capability.
          </p>

          {[
            { title: 'Bag 1 \u2014 Tory (Navigation / Comms / Electronics Lead)', loadout: BAG1_LOADOUT, color: 'text-accent' },
            { title: 'Bag 2 \u2014 Spouse (Medical / Support Lead)', loadout: BAG2_LOADOUT, color: 'text-threat-purple' },
          ].map(({ title, loadout, color }) => (
            <div key={title} className="bg-surface border border-border rounded-md mb-4 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-surface-2">
                <h4 className={`text-sm font-semibold ${color} m-0`}>{title}</h4>
              </div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="bg-surface-2 text-accent text-left px-3 py-1 border-b border-border text-xs uppercase tracking-wider w-[160px]">Compartment</th>
                    <th className="bg-surface-2 text-accent text-left px-3 py-1 border-b border-border text-xs uppercase tracking-wider">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {loadout.map((sec) => (
                    <tr key={sec.compartment}>
                      <td className="px-3 py-1.5 border-b border-border text-accent-2 font-medium align-top text-xs">
                        {sec.compartment}
                      </td>
                      <td className="px-3 py-1.5 border-b border-border">
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {sec.items.map((item) => {
                            const inInventory = itemNames.some((n) =>
                              item.toLowerCase().split(' ').filter((w) => w.length > 3).some((w) => n.includes(w.toLowerCase()))
                            );
                            return (
                              <span key={item} className={`text-xs ${inInventory ? 'text-text-primary' : 'text-threat-yellow'}`}>
                                {inInventory ? '\u2705' : '\u26A0\uFE0F'} {item}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div className="bg-surface border-l-3 border-accent-2 rounded-r-md p-4 text-sm text-text-dim">
            <div className="font-bold text-xs uppercase tracking-wider text-accent-2 mb-1">Vehicle Load Plan</div>
            Both backpacks in back seat (grab-and-go). NANUK 935 in trunk (accessible). NANUK 962 in trunk. Wagon on top or in bed.
            If abandoning vehicle: grab both packs + NANUK 935, load on wagon, and walk.
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* 7. BUGOUT ROUTES                           */}
        {/* ═══════════════════════════════════════════ */}
        <div id="plan-routes" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={7} /> Bugout Routes
          </h2>
          <p className="text-sm text-text-dim mb-4">
            All routes originate from {location.city || 'your location'}. Click any field to edit. Avoid Omaha at all costs.
          </p>

          {/* Route Map */}
          <Suspense fallback={<div className="h-[400px] rounded-lg border border-border bg-surface-2 flex items-center justify-center text-text-dim text-sm">Loading map...</div>}>
            <RouteMap />
          </Suspense>

          {routeIds.map(({ id, label, sublabel }) => {
            const r = routes[id] || { name: '', path: '', distance: '', destination: '', waypoints: '', notes: '' };
            const hasData = r.name || r.path;
            return (
              <div key={id} className="bg-surface border border-border rounded-md mb-4 overflow-hidden">
                <div className={`flex items-center justify-between px-4 py-2.5 border-b border-border ${hasData ? 'bg-threat-green/5' : 'bg-surface-2'}`}>
                  <h4 className="text-sm font-semibold text-accent-2 m-0">{label} <span className="text-text-dim font-normal">({sublabel})</span></h4>
                  {hasData && r.distance && <span className="text-xs text-text-dim">{r.distance}</span>}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-text-dim w-[80px] shrink-0 text-xs uppercase tracking-wider pt-0.5">Name</span>
                    <EditableCell value={r.name} placeholder="e.g., Northwest to Sandhills" onChange={(v) => updateRoute(id, 'name', v)} />
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-text-dim w-[80px] shrink-0 text-xs uppercase tracking-wider pt-0.5">Path</span>
                    <EditableCell value={r.path} placeholder="e.g., US-34 W -> US-281 N -> NE-2 W" onChange={(v) => updateRoute(id, 'path', v)} />
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-text-dim w-[80px] shrink-0 text-xs uppercase tracking-wider pt-0.5">Distance</span>
                    <EditableCell value={r.distance} placeholder="e.g., 200 miles / 3.5 hrs" onChange={(v) => updateRoute(id, 'distance', v)} />
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-text-dim w-[80px] shrink-0 text-xs uppercase tracking-wider pt-0.5">Destination</span>
                    <EditableCell value={r.destination} placeholder="e.g., Sandhills region (Broken Bow / Thedford)" onChange={(v) => updateRoute(id, 'destination', v)} />
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-text-dim w-[80px] shrink-0 text-xs uppercase tracking-wider pt-0.5">Waypoints</span>
                    <EditableCell value={r.waypoints} placeholder="e.g., York (60 mi), Grand Island (100 mi)" onChange={(v) => updateRoute(id, 'waypoints', v)} />
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-text-dim w-[80px] shrink-0 text-xs uppercase tracking-wider pt-0.5">Notes</span>
                    <EditableCell value={r.notes} placeholder="Click to add notes..." onChange={(v) => updateRoute(id, 'notes', v)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* 8. COMMUNICATIONS PLAN                     */}
        {/* ═══════════════════════════════════════════ */}
        <div id="plan-comms" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={8} /> Communications Plan
          </h2>
          <p className="text-sm text-text-dim mb-4">
            Five-tier comms system. Click any field to edit. All data persists locally.
          </p>

          {/* Tier cards */}
          <div className="space-y-3 mb-5">
            {COMMS_TIERS.map((t) => {
              const configured = t.fieldKey ? String(comms[t.fieldKey] || '').trim().length > 0 : false;
              return (
                <div key={t.tier} className="bg-surface border border-border rounded-md p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-accent m-0">
                      Tier {t.tier}: {t.name}
                    </h4>
                    {t.fieldKey && (
                      <span className={`text-[0.65rem] px-2 py-0.5 rounded-full font-medium ${configured ? 'bg-threat-green/15 text-threat-green' : 'bg-threat-yellow/15 text-threat-yellow'}`}>
                        {configured ? 'Configured' : 'Not Set'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-dim mb-1">{t.device} &mdash; {t.capability}</div>
                  <div className="text-xs text-text-dim mb-2">Range: {t.rangeNote}</div>
                  {t.fieldKey && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-dim text-xs uppercase tracking-wider shrink-0">
                        {t.fieldKey === 'meshtasticChannel' ? 'Channel/PSK' : t.fieldKey === 'frsChannel' ? 'Channel' : 'Frequency'}:
                      </span>
                      <EditableCell
                        value={String(comms[t.fieldKey] || '')}
                        placeholder={t.fieldKey === 'meshtasticChannel' ? 'e.g., Family / PSK: ...' : t.fieldKey === 'frsChannel' ? 'e.g., Channel 7' : 'e.g., 146.580 MHz'}
                        onChange={(v) => updateComms(t.fieldKey!, v)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Frequencies and code words */}
          <table className="w-full border-collapse text-sm mb-4">
            <thead>
              <tr>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider w-[160px]">Field</th>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-1.5 border border-border text-accent-2 font-medium">Primary Frequency</td>
                <td className="px-3 py-1.5 border border-border">
                  <EditableCell value={comms.primaryFrequency} placeholder="e.g., 146.580 MHz (private simplex)" onChange={(v) => updateComms('primaryFrequency', v)} />
                </td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 border border-border text-accent-2 font-medium">Backup Frequency</td>
                <td className="px-3 py-1.5 border border-border">
                  <EditableCell value={comms.backupFrequency} placeholder="e.g., 146.520 MHz (national calling)" onChange={(v) => updateComms('backupFrequency', v)} />
                </td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 border border-border text-accent-2 font-medium">FRS Channel</td>
                <td className="px-3 py-1.5 border border-border">
                  <EditableCell value={comms.frsChannel} placeholder="e.g., Channel 7 (primary), Channel 14 (backup)" onChange={(v) => updateComms('frsChannel', v)} />
                </td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 border border-border text-accent-2 font-medium">NOAA Weather</td>
                <td className="px-3 py-1.5 border border-border text-text-primary text-xs">162.550 MHz (Lincoln area)</td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 border border-border text-accent-2 font-medium">Out-of-State Contact</td>
                <td className="px-3 py-1.5 border border-border">
                  <EditableCell value={comms.outOfStateContact} placeholder="Name and number of trusted contact far away" onChange={(v) => updateComms('outOfStateContact', v)} />
                </td>
              </tr>
            </tbody>
          </table>

          {/* Code words */}
          <div className="bg-surface border border-border rounded-md p-4">
            <div className="font-bold text-xs uppercase tracking-wider text-accent-2 mb-2">Code Words (Voice Radio)</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {[
                { word: 'Green', meaning: 'All clear, safe' },
                { word: 'Yellow', meaning: 'Caution, potential threat' },
                { word: 'Red', meaning: 'Immediate danger, need help' },
                { word: 'Rally', meaning: 'Head to rally point' },
                { word: 'Alpha', meaning: 'Taking Route Alpha' },
                { word: 'Bravo', meaning: 'Taking Route Bravo' },
              ].map((cw) => (
                <div key={cw.word} className="flex items-center gap-1.5">
                  <span className={`font-bold text-xs ${cw.word === 'Green' ? 'text-threat-green' : cw.word === 'Yellow' ? 'text-threat-yellow' : cw.word === 'Red' ? 'text-threat-red' : 'text-accent-2'}`}>
                    "{cw.word}"
                  </span>
                  <span className="text-text-dim text-xs">= {cw.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* 9. RALLY POINTS                            */}
        {/* ═══════════════════════════════════════════ */}
        <div id="plan-rally" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border flex items-center gap-2">
            <SectionNumber n={9} /> Rally Points
            <HelpIcon helpKey="rally-points" />
          </h2>
          <p className="text-sm text-text-dim mb-3">
            Pre-designated meeting locations if separated during an event. Click any row to edit. Discuss and memorize these with your spouse.
          </p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider w-[140px]">Point</th>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider">Location / Details</th>
              </tr>
            </thead>
            <tbody>
              <RallyPointRow
                label="Primary (Home)"
                value={rallyPoints.primary}
                placeholder="Your residence \u2014 first place to meet; wait up to 2 hours"
                onChange={(v) => updateRally('primary', v)}
              />
              <RallyPointRow
                label="Secondary"
                value={rallyPoints.secondary}
                placeholder="A landmark within 5 mi you both know \u2014 wait 1 hr, check every 4 hrs for 24 hrs"
                onChange={(v) => updateRally('secondary', v)}
              />
              <RallyPointRow
                label="Route Waypoint"
                value={rallyPoints.outOfArea}
                placeholder="A point on Route Alpha (e.g., gas station in York) \u2014 wait 2 hrs, leave marker"
                onChange={(v) => updateRally('outOfArea', v)}
              />
            </tbody>
          </table>

          <div className="bg-surface border-l-3 border-threat-purple rounded-r-md p-4 text-sm text-text-dim mt-4">
            <div className="font-bold text-xs uppercase tracking-wider text-threat-purple mb-1">Meshtastic Integration</div>
            If Meshtastic devices are active, GPS position sharing replaces much of the guesswork.
            Deploy the ESP32 relay node at a rally point to extend mesh range.
            Always have physical rally points as a fallback &mdash; batteries die, devices break.
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* 10. SHELTER-IN-PLACE                       */}
        {/* ═══════════════════════════════════════════ */}
        <div id="plan-shelter" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={10} /> Shelter-in-Place Plan
          </h2>
          <p className="text-sm text-text-dim mb-4">
            For scenarios where staying home is the right call. Click values to edit.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="bg-surface border border-border rounded-md p-4 text-center">
              <div className="text-[0.65rem] uppercase tracking-wider text-text-dim mb-1">Food Reserves</div>
              <div className="text-2xl font-bold text-accent">
                <EditableCell
                  value={shelter.foodDays ? String(shelter.foodDays) : ''}
                  placeholder="?"
                  onChange={(v) => updateShelter('foodDays', v ? parseInt(v) || null : null)}
                  className="text-2xl font-bold"
                />
              </div>
              <div className="text-xs text-text-dim">days (for 2 people)</div>
            </div>
            <div className="bg-surface border border-border rounded-md p-4 text-center">
              <div className="text-[0.65rem] uppercase tracking-wider text-text-dim mb-1">Water Capacity</div>
              <div className="text-2xl font-bold text-accent">
                <EditableCell
                  value={shelter.waterGallons ? String(shelter.waterGallons) : ''}
                  placeholder="?"
                  onChange={(v) => updateShelter('waterGallons', v ? parseInt(v) || null : null)}
                  className="text-2xl font-bold"
                />
              </div>
              <div className="text-xs text-text-dim">gallons stored</div>
            </div>
            <div className="bg-surface border border-border rounded-md p-4 text-center">
              <div className="text-[0.65rem] uppercase tracking-wider text-text-dim mb-1">Estimated Timeline</div>
              <div className={`text-2xl font-bold ${shelterDays ? 'text-threat-green' : 'text-text-dim'}`}>
                {shelterDays ?? '?'}
              </div>
              <div className="text-xs text-text-dim">days sustainable</div>
            </div>
          </div>

          {/* Tripwire conditions */}
          <div className="bg-surface border border-border rounded-md p-4 mb-4">
            <div className="font-bold text-xs uppercase tracking-wider text-threat-red mb-2">
              Bugout Tripwires (auto-leave conditions)
            </div>
            <p className="text-xs text-text-dim mb-2">
              Pre-agreed conditions with your spouse that automatically trigger bugout. No debate, just go.
            </p>
            {(shelter.tripwires?.length > 0 ? shelter.tripwires : ['']).map((tw, i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <span className="text-threat-red text-xs font-bold shrink-0">#{i + 1}</span>
                <EditableCell
                  value={tw}
                  placeholder={
                    i === 0 ? 'e.g., Gunfire heard within 1 mile'
                    : i === 1 ? 'e.g., Water exhausted with no resupply in 48 hrs'
                    : i === 2 ? 'e.g., Rising Geiger counter readings'
                    : 'Click to add tripwire condition...'
                  }
                  onChange={(v) => {
                    const newTripwires = [...(shelter.tripwires || [])];
                    newTripwires[i] = v;
                    // Add an empty slot if they filled the last one
                    if (i === newTripwires.length - 1 && v.trim().length > 0) {
                      newTripwires.push('');
                    }
                    // Remove trailing empty entries beyond one
                    while (newTripwires.length > 1 && newTripwires[newTripwires.length - 1] === '' && newTripwires[newTripwires.length - 2] === '') {
                      newTripwires.pop();
                    }
                    updateShelter('tripwires', newTripwires);
                  }}
                />
              </div>
            ))}
          </div>

          <div className="bg-surface border-l-3 border-accent rounded-r-md p-4 text-sm text-text-dim">
            <div className="font-bold text-xs uppercase tracking-wider text-accent mb-1">Notes</div>
            <EditableCell
              value={shelter.notes}
              placeholder="Additional shelter-in-place notes (click to edit)..."
              onChange={(v) => updateShelter('notes', v)}
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* 11. 60-SECOND GO CHECKLIST                 */}
        {/* ═══════════════════════════════════════════ */}
        <div id="plan-go" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={11} /> 60-Second Go Checklist
          </h2>
          <p className="text-sm text-text-dim mb-3">
            When it's time to leave <span className="text-threat-red font-semibold">right now</span>, grab these in order. Inventory status shown live.
          </p>

          <div className="bg-surface border border-border rounded-md p-4">
            {GO_CHECKLIST.map((item, idx) => {
              const match = inventoryMatch(item.equipKeywords);
              const checked = goChecked[idx] || false;
              return (
                <label
                  key={idx}
                  className={`flex items-start gap-3 py-2 text-sm cursor-pointer transition-colors ${
                    checked ? 'text-text-dim line-through' : 'text-text-primary hover:text-accent'
                  } ${idx < GO_CHECKLIST.length - 1 ? 'border-b border-border/50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setGoChecked((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                    className="accent-accent mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="font-medium">{idx + 1}. {item.label}</span>
                    {item.equipKeywords.length > 0 && (
                      <div className={`text-xs mt-0.5 ${match.found ? 'text-threat-green' : 'text-threat-red'}`}>
                        {match.found ? '\u2705' : '\u274C'} {match.label}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          <div className="bg-surface border-l-3 border-threat-yellow rounded-r-md p-4 text-sm text-text-dim mt-4">
            <div className="font-bold text-xs uppercase tracking-wider text-threat-yellow mb-1">If You Have 15-30 Minutes</div>
            Also grab: blankets/sleeping bags, extra pantry food, fill ALL three 5-gal buckets,
            pet supplies, sentimental items (photos on a USB drive), tealight candles.
            Check Geiger counter readings before choosing your route.
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* 12. EMERGENCY CONTACTS                     */}
        {/* ═══════════════════════════════════════════ */}
        <div id="plan-contacts" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border flex items-center gap-2">
            <SectionNumber n={12} /> Emergency Contacts
            <HelpIcon helpKey="contacts" />
          </h2>

          {/* Personal contacts */}
          <p className="text-sm text-text-dim mb-3">
            Click any row to edit. Personal contacts are stored locally.
          </p>
          <table className="w-full border-collapse text-sm mb-4">
            <thead>
              <tr>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider w-[140px]">Role</th>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider">Name / Number</th>
              </tr>
            </thead>
            <tbody>
              <RallyPointRow
                label="ICE #1"
                value={contacts.ice1}
                placeholder="Click to set primary emergency contact..."
                onChange={(v) => updateContacts('ice1', v)}
              />
              <RallyPointRow
                label="ICE #2"
                value={contacts.ice2}
                placeholder="Click to set secondary emergency contact..."
                onChange={(v) => updateContacts('ice2', v)}
              />
              <RallyPointRow
                label="Neighbor"
                value={contacts.neighbor}
                placeholder="Click to set neighbor contact..."
                onChange={(v) => updateContacts('neighbor', v)}
              />
              <RallyPointRow
                label="Out-of-State"
                value={contacts.outOfState || comms.outOfStateContact || ''}
                placeholder="Trusted contact far from your area (both memorize this number)"
                onChange={(v) => {
                  updateContacts('outOfState', v);
                  // Also sync to comms plan
                  updateComms('outOfStateContact', v);
                }}
              />
            </tbody>
          </table>

          {/* Standard emergency numbers */}
          <div className="bg-surface border border-border rounded-md overflow-hidden">
            <div className="px-4 py-2.5 bg-surface-2 border-b border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-accent m-0">Standard Emergency Numbers</h4>
            </div>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {[
                  { label: '911', number: '911', note: 'Local emergency (may be overwhelmed in major event)' },
                  { label: 'Lancaster Co. Emergency Mgmt', number: '(402) 441-7204', note: 'Lincoln / Lancaster County' },
                  { label: 'Nebraska Emergency Mgmt (NEMA)', number: '(402) 471-7421', note: 'State-level coordination' },
                  { label: 'NOAA Weather Radio', number: '162.550 MHz', note: 'Lincoln area continuous broadcasts' },
                  { label: 'National Suicide Prevention', number: '988', note: 'Mental health crisis line' },
                  { label: 'Poison Control', number: '1-800-222-1222', note: '' },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="px-3 py-1.5 border-b border-border text-text-primary font-medium w-[220px]">{row.label}</td>
                    <td className="px-3 py-1.5 border-b border-border text-accent font-mono text-xs">{row.number}</td>
                    <td className="px-3 py-1.5 border-b border-border text-text-dim text-xs">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
