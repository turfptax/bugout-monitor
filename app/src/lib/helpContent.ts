export interface HelpEntry {
  title: string;
  content: string;
}

const helpContent: Record<string, HelpEntry> = {
  'threat-overall': {
    title: 'Overall Threat Level',
    content: 'Composite threat score (1-10) combining solar, nuclear, weather, and geopolitical factors. Updated automatically from OSINT sources.',
  },
  'threat-solar': {
    title: 'Solar / Carrington Threat',
    content: 'Risk of solar storms, CMEs, and geomagnetic disturbances that could damage electronics and power grids. Based on NOAA SWPC and NASA DONKI data.',
  },
  'threat-nuclear': {
    title: 'Nuclear Threat',
    content: 'Assessment of nuclear/geopolitical risk based on Doomsday Clock status, arms control headlines, and GDELT global news analysis.',
  },
  'threat-weather': {
    title: 'Weather / Tornado Threat',
    content: 'Local severe weather risk based on NWS alerts for your county. Includes tornado warnings, severe thunderstorms, and other hazards.',
  },
  'diamond-index': {
    title: 'Diamond Collapse Index',
    content: 'Based on Jared Diamond\'s 5-factor framework from "Collapse." Evaluates environmental damage, climate change, hostile neighbors, trade disruption, and society\'s response capacity.',
  },
  'osint-panel': {
    title: 'OSINT Intelligence Feed',
    content: 'Real-time open-source intelligence from 8 data sources including NOAA, NASA, NWS, GDELT, and economic indicators.',
  },
  'equipment-inventory': {
    title: 'Equipment Inventory',
    content: 'Track your preparedness gear across 15 categories. Items are saved locally in your browser. Use Import/Export to back up your data.',
  },
  'plan-overview': {
    title: 'Emergency Plan',
    content: 'Your complete disaster preparedness plan with rally points, evacuation routes, communication protocols, and emergency contacts.',
  },
  'settings-api': {
    title: 'API Keys',
    content: 'Configure API keys for weather alerts (NWS), solar data (NOAA), and other OSINT sources. Most sources are free and require no key.',
  },
  'settings-location': {
    title: 'Location Settings',
    content: 'Set your home location for localized weather alerts and nearby threat assessments.',
  },
  'rally-points': {
    title: 'Rally Points',
    content: 'Pre-designated meeting locations for your family/group. Set primary, secondary, and out-of-area rally points.',
  },
  'contacts': {
    title: 'Emergency Contacts',
    content: 'Key contacts for emergencies including family, neighbors, and local emergency services.',
  },
};

export default helpContent;
