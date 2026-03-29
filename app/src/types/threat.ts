export interface ThreatLevel {
  level: number;
  label: string;
  reasoning: string;
}

export interface DiamondFactor {
  level: number;
  reasoning: string;
}

export interface DiamondIndex {
  environmental: DiamondFactor;
  climate: DiamondFactor;
  hostile: DiamondFactor;
  trade: DiamondFactor;
  response: DiamondFactor;
  composite: ThreatLevel;
}

export interface ThreatAssessment {
  solar: ThreatLevel;
  nuclear: ThreatLevel;
  weather: ThreatLevel;
  overall: ThreatLevel;
  diamond?: DiamondIndex;
  _meta?: { source: string; model: string };
}

export interface SolarData {
  status: string;
  currentKp: number;
  maxKp24h: number;
  kpDescription: string;
  stormLevel: string;
}

export interface DonkiData {
  status: string;
  cmeCount: number;
  flareCount: number;
  stormCount: number;
  hasEarthDirectedCME: boolean;
  hasXFlare: boolean;
  maxStormKp: number;
}

export interface SwpcAlertsData {
  status: string;
  alertCount: number;
  highestGeomagScale: number;
  highestRadioBlackout: number;
  hasWarning: boolean;
  hasWatch: boolean;
  forecast?: {
    mFlareProb: number;
    xFlareProb: number;
  };
}

export interface WeatherAlert {
  event: string;
  severity: string;
  headline: string;
}

export interface WeatherData {
  status: string;
  count: number;
  highestSeverity: string;
  statewideSevereCount: number;
  hasTornadoWarning: boolean;
  hasTornadoWatch: boolean;
  alerts: WeatherAlert[];
}

export interface NuclearHeadline {
  source: string;
  title: string;
}

export interface NuclearData {
  status: string;
  headlineCount: number;
  doomsdayClock: { value: string; lastUpdated: string };
  headlines: NuclearHeadline[];
}

export interface GdeltCategory {
  articleCount: number;
}

export interface GdeltArticle {
  title: string;
  queryCategory: string;
  tone: number;
}

export interface GdeltData {
  status: string;
  totalArticleCount: number;
  nuclear?: GdeltCategory;
  military?: GdeltCategory;
  unrest?: GdeltCategory;
  avgNuclearMilitaryTone: number;
  topArticles: GdeltArticle[];
}

export interface DroughtData {
  status: string;
  highestCategory: string;
  severityScore: number;
}

export interface EconomicData {
  status: string;
  stressScore: number;
}

export interface SourceData {
  solarData?: SolarData;
  donkiData?: DonkiData;
  swpcAlertsData?: SwpcAlertsData;
  weatherData?: WeatherData;
  nuclearData?: NuclearData;
  gdeltData?: GdeltData;
  droughtData?: DroughtData;
  economicData?: EconomicData;
}

export interface ThreatData {
  timestamp: string;
  assessment: ThreatAssessment;
  sourceData: SourceData;
  meta: { source: string; model: string; sourceCount: number };
}
