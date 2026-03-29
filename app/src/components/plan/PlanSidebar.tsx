interface Props {
  activeSection: string;
  onSectionClick: (id: string) => void;
}

const sections = [
  { id: 'threat', label: 'Threat Assessment' },
  { id: 'decision', label: 'Decision Framework' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'inventory', label: 'Gear Inventory' },
  { id: 'gaps', label: 'Gap Analysis' },
  { id: 'loadout', label: 'Loadout Config' },
  { id: 'routes', label: 'Evacuation Routes' },
  { id: 'comms', label: 'Communications' },
  { id: 'rally', label: 'Rally Points' },
  { id: 'shelter', label: 'Shelter Plan' },
  { id: 'go', label: 'Go/No-Go Checklist' },
  { id: 'contacts', label: 'Emergency Contacts' },
];

export default function PlanSidebar({ activeSection, onSectionClick }: Props) {
  return (
    <div className="w-[280px] min-w-[280px] bg-surface border-r border-border py-4 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto hidden lg:block">
      <h3 className="px-5 text-[0.7rem] uppercase tracking-widest text-text-dim mb-3">
        Plan Sections
      </h3>
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => onSectionClick(s.id)}
          className={`block w-full text-left px-5 py-2 text-[0.85rem] border-l-[3px] transition-all duration-150 cursor-pointer bg-transparent ${
            activeSection === s.id
              ? 'text-accent border-l-accent bg-accent/[0.06]'
              : 'text-text-dim border-l-transparent hover:text-accent hover:bg-accent/[0.06] hover:border-l-accent'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

export { sections };
