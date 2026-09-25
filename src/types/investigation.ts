// GeoChronos Investigation State Types — Sequential 18-State Product Flow
export type InvestigationState =
  | 'QUERY'
  | 'INTENT'
  | 'RIVER_SEARCH'
  | 'RIVER_MAP_GENERATED'
  | 'BUILDING_SEARCH'
  | 'BUILDINGS_APPEAR'
  | 'TEMPORAL_FILTER'
  | 'CANDIDATES_APPEAR'
  | 'SELECT_SITE'
  | 'TIME_MACHINE'
  | 'BEFORE_AFTER'
  | 'CHANGE_EVENT'
  | 'WHY_CHANGE'
  | 'VERIFICATION'
  | 'EVIDENCE'
  | 'PROVENANCE'
  | 'ANALYST_REVIEW'
  | 'REPORT';

export const INVESTIGATION_STATES: InvestigationState[] = [
  'QUERY',
  'INTENT',
  'RIVER_SEARCH',
  'RIVER_MAP_GENERATED',
  'BUILDING_SEARCH',
  'BUILDINGS_APPEAR',
  'TEMPORAL_FILTER',
  'CANDIDATES_APPEAR',
  'SELECT_SITE',
  'TIME_MACHINE',
  'BEFORE_AFTER',
  'CHANGE_EVENT',
  'WHY_CHANGE',
  'VERIFICATION',
  'EVIDENCE',
  'PROVENANCE',
  'ANALYST_REVIEW',
  'REPORT',
];

export interface QueryIntent {
  raw?: string;
  fragments?: QueryFragment[];
  temporalRange?: { start: string; end: string };
  spatialConstraint?: any;
  targetFeatures?: string[];
  relationship?: string;
}

export interface QueryFragment {
  text: string;
  type: 'FEATURE' | 'TEMPORAL' | 'SPATIAL';
  label: string;
  color: string;
}

export interface SearchSignal {
  id: string;
  type: 'spatial' | 'feature' | 'temporal' | 'semantic';
  label: string;
  status: 'pending' | 'active' | 'complete';
  progress: number;
}

export interface GeoCandidate {
  id: string;
  featureId: string;
  coordinates: [number, number];
  name: string;
  river?: string;
  score: number;
  status: 'ordinary' | 'candidate' | 'selected' | 'verified' | 'rejected';
  geometry?: GeoJSON.Geometry | null;
  properties: Record<string, unknown>;
}

export interface TemporalObservation {
  id: string;
  year: number;
  date: string;
  source: string;
  sensor: string;
  imageUrl?: string;
  hasFeature: boolean;
  notes?: string;
}

export interface ChangeEvent {
  id: string;
  featureId?: string;
  siteId?: string;
  title?: string;
  river?: string;
  locality?: string;
  interval?: string;
  intervalHuman?: string;
  regulatoryClassification?: string;
  type: 'appearance' | 'disappearance' | 'expansion' | 'contraction' | 'persistence' | 'change';
  beforeObservation: TemporalObservation;
  afterObservation: TemporalObservation;
  confidence: number;
  extent: {
    area: number;
    unit: string;
    floors?: number;
  };
  verified: boolean;
}

export interface ChangeExplanation {
  what: string;
  where: string;
  when: string;
  extent: string;
  previousState: string;
  currentState: string;
  narrative: string;
  confidence: number;
}

export interface VerificationCheck {
  id: string;
  name: string;
  type: 'temporal_persistence' | 'spatial_consistency' | 'cross_observation' | 'magnitude' | 'quality';
  status: 'pending' | 'passing' | 'failing' | 'warning';
  detail: string;
  falseSignals?: string[];
}

export interface EvidenceItem {
  unavailableReason?: string;
  changeEventId?: string;
  id: string;
  targetSite?: string;
  location: { latitude: number; longitude: number; lng?: number; lat?: number };
  epochBefore?: any;
  epochAfter?: any;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  acquisitionBefore?: string;
  acquisitionAfter?: string;
  sensor?: string;
  changeInterval?: string;
  changeType?: string;
  confidence?: number;
  processing?: string;
}

export interface ProvenanceNode {
  id: string;
  type: 'finding' | 'feature' | 'observation' | 'stac_item' | 'source' | 'zarr_coordinate' | 'spatial_slice';
  label: string;
  detail: string;
  description?: string;
  uri?: string;
  parent?: string;
}

export interface AnalystDecision {
  action: 'CONFIRM' | 'REJECT' | 'REFINE';
  timestamp: string;
  notes?: string;
}

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
}

export interface SiteRecord {
  siteId: string;
  name: string;
  coordinates: [number, number];
  river: string;
  riverProximityM: number;
  statesByYear: Record<string, {
    status: string;
    description: string;
    surfaceType: string;
    builtAreaSqm: number;
    spectralNDBI: number;
    spectralNDVI: number;
    floodVulnerability: string;
  }>;
}

export interface FeatureRecord {
  id: string;
  featureId: string;
  name: string;
  locality: string;
  river: string;
  status: string;
  score: number;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
}

export interface TemporalStateRecord {
  siteId: string;
  featureId: string;
  observationId: string;
  date: string;
  year?: number;
  state: string;
  description?: string;
  surfaceType?: string;
  builtAreaSqm?: number;
  spectralNDBI?: number;
  spectralNDVI?: number;
  floodVulnerability?: string;
  geometry: GeoJSON.Geometry | null;
  rasterReference?: string;
}

export interface LocalInvestigationDataset {
  manifest: {
    name: string;
    version: string;
    classification: string;
    aoi: string;
    center: [number, number];
    bounds: [number, number, number, number];
    temporalRange: {
      start: string;
      end: string;
      keyEpochs: number[];
    };
    queryCapabilities: string[];
  };
  sites: GeoJSON.FeatureCollection;
  features: GeoJSON.FeatureCollection;
  observations: TemporalObservation[];
  temporalStates: Record<string, SiteRecord>;
  changeEvents: ChangeEvent[];
  evidence: Record<string, any>;
  provenance: ProvenanceNode[];
}

export interface InvestigationReport {
  query: string;
  searchContext: string;
  selectedSite: GeoCandidate | null;
  temporalEvidence: TemporalObservation[];
  changeEvent: ChangeEvent | null;
  changeExplanation: ChangeExplanation | null;
  verification: VerificationCheck[];
  provenance: ProvenanceNode[];
  decision: AnalystDecision | null;
}
