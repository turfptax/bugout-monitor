import { useState, useRef, useCallback, useEffect } from 'react';
import PlanSidebar, { sections } from './PlanSidebar';
import RallyPointRow from './RallyPointRow';
import HelpIcon from '../layout/HelpIcon';

export default function PlanTab() {
  const [activeSection, setActiveSection] = useState('threat');
  const contentRef = useRef<HTMLDivElement>(null);
  const [rallyPoints, setRallyPoints] = useState({
    primary: '',
    secondary: '',
    outOfArea: '',
  });
  const [contacts, setContacts] = useState({
    ice1: '',
    ice2: '',
    neighbor: '',
    outOfState: '',
  });

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

  const SectionNumber = ({ n }: { n: number }) => (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent text-bg text-xs font-bold mr-2">
      {n}
    </span>
  );

  return (
    <div className="flex">
      <PlanSidebar activeSection={activeSection} onSectionClick={handleSectionClick} />

      <div ref={contentRef} className="flex-1 px-4 md:px-8 lg:px-12 py-6 max-w-[900px]">
        {/* 1. Threat Assessment */}
        <div id="plan-threat" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={1} /> Threat Assessment
          </h2>
          <p className="text-sm text-text-dim mb-3">
            Current threat levels are displayed on the Dashboard tab. This section defines the threat categories monitored and how levels are determined.
          </p>
          <div className="bg-surface border-l-3 border-accent-2 rounded-r-md p-4 text-sm text-text-dim">
            <div className="font-bold text-xs uppercase tracking-wider text-accent-2 mb-1">Data Sources</div>
            NOAA SWPC, NASA DONKI, NWS Alerts, GDELT, Arms Control RSS, US Drought Monitor, FRED Economic Data
          </div>
        </div>

        {/* 2. Decision Framework */}
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
              <tr><td className="px-3 py-1.5 border border-border text-threat-green font-semibold">1-3 (Low)</td><td className="px-3 py-1.5 border border-border text-text-dim">Monitor. Maintain readiness.</td></tr>
              <tr className="bg-surface/50"><td className="px-3 py-1.5 border border-border text-threat-yellow font-semibold">4-6 (Elevated)</td><td className="px-3 py-1.5 border border-border text-text-dim">Alert family. Top off fuel, water, cash.</td></tr>
              <tr><td className="px-3 py-1.5 border border-border text-threat-red font-semibold">7-8 (Severe)</td><td className="px-3 py-1.5 border border-border text-text-dim">Load vehicles. Activate comms plan. Stage at rally point.</td></tr>
              <tr className="bg-surface/50"><td className="px-3 py-1.5 border border-border text-threat-extreme font-semibold">9-10 (Extreme)</td><td className="px-3 py-1.5 border border-border text-text-dim">Execute bugout. Move to shelter location.</td></tr>
            </tbody>
          </table>
        </div>

        {/* 3. Scenarios */}
        <div id="plan-scenarios" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={3} /> Scenarios
          </h2>
          <p className="text-sm text-text-dim mb-3">
            Primary threat scenarios with specific response procedures.
          </p>
          {['Nuclear Event', 'Carrington-Level Solar Storm', 'Severe Weather / Tornado', 'Civil Unrest / Infrastructure Failure'].map((scenario) => (
            <div key={scenario} className="bg-surface border border-border rounded-md p-4 mb-3">
              <h4 className="text-sm font-semibold text-accent m-0 mb-2">{scenario}</h4>
              <p className="text-xs text-text-dim">
                Detailed response procedures to be filled in. Include timeline, specific actions, equipment needed, and rally point activation.
              </p>
            </div>
          ))}
        </div>

        {/* 4. Gear Inventory */}
        <div id="plan-inventory" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={4} /> Gear Inventory
          </h2>
          <p className="text-sm text-text-dim">
            Full equipment inventory is managed on the Equipment tab. Navigate there to add, edit, and organize your gear across 15 categories.
          </p>
        </div>

        {/* 5. Gap Analysis */}
        <div id="plan-gaps" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={5} /> Gap Analysis
          </h2>
          <p className="text-sm text-text-dim">
            Identify missing equipment, skills, or plans. Review each category in your inventory and note what still needs to be acquired or practiced.
          </p>
        </div>

        {/* 6. Loadout Configuration */}
        <div id="plan-loadout" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={6} /> Loadout Configuration
          </h2>
          <p className="text-sm text-text-dim mb-3">
            Define what goes in each bag/vehicle for different scenarios and durations.
          </p>
          {['72-Hour Bag (Primary BOB)', 'Vehicle Kit', 'Get Home Bag', 'Shelter-in-Place Kit'].map((loadout) => (
            <div key={loadout} className="bg-surface border border-border rounded-md p-4 mb-3">
              <h4 className="text-sm font-semibold text-threat-purple m-0 mb-2">{loadout}</h4>
              <p className="text-xs text-text-dim">Contents list to be configured.</p>
            </div>
          ))}
        </div>

        {/* 7. Evacuation Routes */}
        <div id="plan-routes" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={7} /> Evacuation Routes
          </h2>
          <p className="text-sm text-text-dim mb-3">
            Pre-planned routes with alternates. Consider traffic patterns, bridge dependencies, and fuel stops.
          </p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider">Route</th>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider">Direction</th>
                <th className="bg-surface-2 text-accent text-left px-3 py-1.5 border border-border text-xs uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="px-3 py-1.5 border border-border font-medium text-accent-2">Primary</td><td className="px-3 py-1.5 border border-border text-text-dim italic">Click to edit</td><td className="px-3 py-1.5 border border-border text-text-dim italic">Click to edit</td></tr>
              <tr><td className="px-3 py-1.5 border border-border font-medium text-accent-2">Alternate 1</td><td className="px-3 py-1.5 border border-border text-text-dim italic">Click to edit</td><td className="px-3 py-1.5 border border-border text-text-dim italic">Click to edit</td></tr>
              <tr><td className="px-3 py-1.5 border border-border font-medium text-accent-2">Alternate 2</td><td className="px-3 py-1.5 border border-border text-text-dim italic">Click to edit</td><td className="px-3 py-1.5 border border-border text-text-dim italic">Click to edit</td></tr>
            </tbody>
          </table>
        </div>

        {/* 8. Communications */}
        <div id="plan-comms" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={8} /> Communications Plan
          </h2>
          <p className="text-sm text-text-dim mb-3">
            Layered communication strategy from primary (cell) through backup (radio, satellite, physical).
          </p>
          <div className="bg-surface border-l-3 border-threat-yellow rounded-r-md p-4 text-sm text-text-dim">
            <div className="font-bold text-xs uppercase tracking-wider text-threat-yellow mb-1">Comm Priority</div>
            1. Cell Phone / Text &rarr; 2. FRS/GMRS Radio &rarr; 3. HAM Radio &rarr; 4. Satellite (Garmin inReach) &rarr; 5. Physical Runner
          </div>
        </div>

        {/* 9. Rally Points */}
        <div id="plan-rally" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border flex items-center gap-2">
            <SectionNumber n={9} /> Rally Points
            <HelpIcon helpKey="rally-points" />
          </h2>
          <p className="text-sm text-text-dim mb-3">
            Pre-designated meeting locations. Click any row to edit.
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
                label="Primary"
                value={rallyPoints.primary}
                placeholder="Click to set primary rally point..."
                onChange={(v) => setRallyPoints((s) => ({ ...s, primary: v }))}
              />
              <RallyPointRow
                label="Secondary"
                value={rallyPoints.secondary}
                placeholder="Click to set secondary rally point..."
                onChange={(v) => setRallyPoints((s) => ({ ...s, secondary: v }))}
              />
              <RallyPointRow
                label="Out-of-Area"
                value={rallyPoints.outOfArea}
                placeholder="Click to set out-of-area rally point..."
                onChange={(v) => setRallyPoints((s) => ({ ...s, outOfArea: v }))}
              />
            </tbody>
          </table>
        </div>

        {/* 10. Shelter Plan */}
        <div id="plan-shelter" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={10} /> Shelter Plan
          </h2>
          <p className="text-sm text-text-dim mb-3">
            Shelter-in-place procedures and alternative shelter locations.
          </p>
          {['Home (Shelter-in-Place)', 'Primary Bugout Location', 'Secondary Bugout Location'].map((loc) => (
            <div key={loc} className="bg-surface border border-border rounded-md p-4 mb-3">
              <h4 className="text-sm font-semibold text-accent-2 m-0 mb-2">{loc}</h4>
              <p className="text-xs text-text-dim">Details to be configured.</p>
            </div>
          ))}
        </div>

        {/* 11. Go/No-Go Checklist */}
        <div id="plan-go" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border">
            <SectionNumber n={11} /> Go / No-Go Checklist
          </h2>
          <p className="text-sm text-text-dim mb-3">
            Final checklist before departing. All items must be checked before executing bugout.
          </p>
          <div className="bg-surface border border-border rounded-md p-4">
            {[
              'Family/group accounted for',
              'Bags loaded in vehicle',
              'Fuel tank full',
              'Cash on hand',
              'Communications check complete',
              'Route confirmed (check conditions)',
              'Destination contacted',
              'Home secured (water off, breakers off)',
              'Pets / medications accounted for',
              'Documents bag packed',
            ].map((item) => (
              <label key={item} className="flex items-center gap-2 py-1.5 text-sm text-text-dim cursor-pointer hover:text-text-primary transition-colors">
                <input type="checkbox" className="accent-accent" />
                {item}
              </label>
            ))}
          </div>
        </div>

        {/* 12. Emergency Contacts */}
        <div id="plan-contacts" className="mb-12 scroll-mt-20">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-border flex items-center gap-2">
            <SectionNumber n={12} /> Emergency Contacts
            <HelpIcon helpKey="contacts" />
          </h2>
          <table className="w-full border-collapse text-sm">
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
                onChange={(v) => setContacts((s) => ({ ...s, ice1: v }))}
              />
              <RallyPointRow
                label="ICE #2"
                value={contacts.ice2}
                placeholder="Click to set secondary emergency contact..."
                onChange={(v) => setContacts((s) => ({ ...s, ice2: v }))}
              />
              <RallyPointRow
                label="Neighbor"
                value={contacts.neighbor}
                placeholder="Click to set neighbor contact..."
                onChange={(v) => setContacts((s) => ({ ...s, neighbor: v }))}
              />
              <RallyPointRow
                label="Out-of-State"
                value={contacts.outOfState}
                placeholder="Click to set out-of-state contact..."
                onChange={(v) => setContacts((s) => ({ ...s, outOfState: v }))}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
