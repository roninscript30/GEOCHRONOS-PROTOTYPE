import type {
  QueryFragment,
  SearchSignal,
  GeoCandidate,
  TemporalObservation,
  ChangeEvent,
  VerificationCheck,
  EvidenceItem,
  ProvenanceNode,
} from '@/types/investigation';

import chennaiData from '@/data/chennai_changes.json';

// Export complete raw Chennai scraped dataset
export const CHENNAI_DATASET = chennaiData;

// ──────────────── Flagship Query (Chennai River Basin) ────────────────

export const FLAGSHIP_QUERY = 'Find newly constructed buildings near rivers in Chennai';

export const QUERY_FRAGMENTS: QueryFragment[] = [
  {
    text: 'BUILDINGS',
    type: 'FEATURE',
    label: 'Feature Extraction (MSI Built Surface)',
    color: '#00d4ff',
  },
  {
    text: 'NEWLY CONSTRUCTED',
    type: 'TEMPORAL',
    label: 'Temporal Change (2011–2026 Interval)',
    color: '#f59e0b',
  },
  {
    text: 'NEAR RIVERS (CHENNAI)',
    type: 'SPATIAL',
    label: 'Adyar & Cooum River Buffer',
    color: '#22c55e',
  },
];

// ──────────────── Search Signals ────────────────

export const SEARCH_SIGNALS: SearchSignal[] = [
  { id: 'spatial-1', type: 'spatial', label: 'Adyar / Cooum River Geometry', status: 'pending', progress: 0 },
  { id: 'feature-1', type: 'feature', label: 'Building Footprint Detection', status: 'pending', progress: 0 },
  { id: 'temporal-1', type: 'temporal', label: 'Multi-Temporal Sentinel-2 Passes', status: 'pending', progress: 0 },
  { id: 'semantic-1', type: 'semantic', label: 'Floodplain Buffer Constraint (150m)', status: 'pending', progress: 0 },
];

// ──────────────── River GeoJSON (Chennai: Adyar, Cooum, Buckingham Canal) ────────────────

export const RIVER_GEOJSON = chennaiData.riversGeoJSON as any;

// ──────────────── Building Candidates in Chennai ────────────────

export const BUILDING_CANDIDATES: GeoCandidate[] = chennaiData.detectedCandidateBuildings.map(b => ({
  id: b.id,
  featureId: b.featureId,
  coordinates: b.coordinates as [number, number],
  name: b.name,
  score: b.score,
  status: b.status as 'candidate' | 'ordinary' | 'selected' | 'verified' | 'rejected',
  properties: b.properties,
}));

// ──────────────── Building GeoJSON (Polygons with heights) ────────────────

export const BUILDINGS_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: chennaiData.detectedCandidateBuildings.map((b, i) => ({
    type: 'Feature' as const,
    id: i + 1,
    properties: {
      id: b.id,
      name: b.name,
      score: b.score,
      status: b.status,
      area_sqm: b.properties.area_sqm,
      height: b.properties.height_m,
      river: b.properties.river,
      locality: b.properties.locality,
      proximity_river_m: b.properties.proximity_river_m,
      risk_level: b.properties.risk_level,
    },
    geometry: b.geometry,
  })),
} as any;

// ──────────────── Temporal Observations (Chennai 2011 to 2026) ────────────────

export const TEMPORAL_OBSERVATIONS: TemporalObservation[] = chennaiData.temporalObservationsChennai.map(obs => ({
  id: obs.id,
  year: obs.year,
  date: obs.date,
  source: obs.source,
  sensor: obs.sensor,
  hasFeature: obs.hasFeature,
}));

// ──────────────── Primary Change Event (Kotturpuram Adyar River Site Alpha) ────────────────

export const CHANGE_EVENT: ChangeEvent = {
  id: chennaiData.primaryChangeEvent.id,
  type: chennaiData.primaryChangeEvent.type as 'appearance',
  beforeObservation: TEMPORAL_OBSERVATIONS.find(o => o.year === 2020) || TEMPORAL_OBSERVATIONS[2],
  afterObservation: TEMPORAL_OBSERVATIONS.find(o => o.year === 2024) || TEMPORAL_OBSERVATIONS[3],
  confidence: chennaiData.primaryChangeEvent.confidence,
  extent: {
    area: chennaiData.primaryChangeEvent.extent.area,
    unit: chennaiData.primaryChangeEvent.extent.unit,
  },
  verified: chennaiData.primaryChangeEvent.verified,
};

// ──────────────── Verification Checks (Chennai Monsoon & Edge Verification) ────────────────

export const VERIFICATION_CHECKS: VerificationCheck[] = chennaiData.verificationMatrix.map(v => ({
  id: v.id,
  name: v.name,
  type: v.type as 'temporal_persistence' | 'spatial_consistency' | 'cross_observation' | 'magnitude' | 'quality',
  status: 'pending',
  detail: v.detail,
  falseSignals: [v.evaluatedFalseSignal, v.dismissalRationale],
}));

// ──────────────── Evidence (Chennai Kotturpuram Adyar Site) ────────────────

export const EVIDENCE: EvidenceItem = {
  id: 'ev-chn-001',
  beforeImageUrl: '/fixtures/chennai_adyar_2020_pre.jpg',
  afterImageUrl: '/fixtures/chennai_adyar_2024_post.jpg',
  location: { lng: 80.2385, lat: 13.0195, longitude: 80.2385, latitude: 13.0195 },
  acquisitionBefore: '2020-01-15 (Dry Season, 0.2% Cloud)',
  acquisitionAfter: '2024-03-22 (Pre-Monsoon, 0.0% Cloud)',
  sensor: 'Copernicus Sentinel-2A MSI (Level-2A BOA)',
  changeInterval: '4 years 2 months (April 2020 – March 2024)',
  changeType: 'New Impervious Building Appearance (+3450 m²)',
  confidence: 0.96,
  processing: 'ESA Sen2Cor BOA reflectance', epochBefore: { date: '2020-01-15' }, epochAfter: { date: '2024-03-22' },
};

// ──────────────── Provenance Lineage (Chennai Datacube Trace) ────────────────

export const PROVENANCE_NODES: ProvenanceNode[] = chennaiData.provenanceLineage.map(node => ({
  id: node.id,
  type: node.type as 'finding' | 'feature' | 'observation' | 'stac_item' | 'source' | 'zarr_coordinate' | 'spatial_slice',
  label: node.label,
  detail: node.detail,
}));

// ──────────────── Map Center for Chennai Investigation ────────────────

export const INVESTIGATION_CENTER: [number, number] = [80.2385, 13.0195]; // Kotturpuram Adyar River Corridor, Chennai
export const INVESTIGATION_ZOOM = 13.5;
export const SITE_ZOOM = 16.5;
