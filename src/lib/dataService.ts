// Client-side deterministic data service for GeoChronos Analyst UI
// Supports dynamic, multi-scenario geospatial analysis across Tamil Nadu

import type {
  GeoCandidate,
  TemporalObservation,
  ChangeEvent,
  EvidenceItem,
  LocalInvestigationDataset,
  ProvenanceNode,
  QueryIntent,
  SiteRecord,
  TemporalStateRecord,
  ChangeExplanation,
} from '@/types/investigation';

export const DEFAULT_QUERY = 'Find newly constructed buildings near rivers in Chennai';

export function buildQueryIntentFromText(rawQuery: string): QueryIntent {
  const query = (rawQuery || DEFAULT_QUERY).trim();
  const normalized = query.toLowerCase();

  let featureText = 'FEATURE DETECTION';
  let featureLabel = 'Feature Extraction';
  if (normalized.includes('road') || normalized.includes('highway') || normalized.includes('corridor') || normalized.includes('transport')) {
    featureText = 'CORRIDOR INFRASTRUCTURE';
    featureLabel = 'Road & Arterial Network';
  } else if (normalized.includes('disappear') || normalized.includes('demolish') || normalized.includes('clear') || normalized.includes('removal')) {
    featureText = 'STRUCTURE DEMOLITION';
    featureLabel = 'Encroachment Clearance';
  } else if (normalized.includes('growth') || normalized.includes('major') || normalized.includes('industrial') || normalized.includes('factory')) {
    featureText = 'INDUSTRIAL MEGA-STRUCTURE';
    featureLabel = 'High-Volume Facility';
  } else if (normalized.includes('building') || normalized.includes('structure')) {
    featureText = 'BUILT FOOTPRINT';
    featureLabel = 'Structure Boundary';
  }

  let temporalText = 'TEMPORAL CHANGE';
  let temporalLabel = 'Temporal Signal';
  if (normalized.includes('disappear') || normalized.includes('demolish') || normalized.includes('removal')) {
    temporalText = 'STRUCTURE DISAPPEARANCE';
    temporalLabel = 'Footprint Removal (2020–2026)';
  } else if (normalized.includes('growth') || normalized.includes('major') || normalized.includes('expansion')) {
    temporalText = 'SIGNIFICANT EXPANSION (>5,000 m²)';
    temporalLabel = 'Major Footprint Growth';
  } else if (normalized.includes('new') || normalized.includes('construction') || normalized.includes('appear')) {
    temporalText = 'NEW CONSTRUCTION';
    temporalLabel = 'First Observation Filter';
  }

  let spatialText = 'SPATIAL RELATION';
  let spatialLabel = 'Spatial Constraint';
  if (normalized.includes('road') || normalized.includes('highway') || normalized.includes('corridor')) {
    spatialText = 'HIGHWAY LOGISTICS BUFFER (100m)';
    spatialLabel = 'Right-of-Way Corridor';
  } else if (normalized.includes('wetland') || normalized.includes('marsh') || normalized.includes('lake') || normalized.includes('waterbody')) {
    spatialText = 'WETLAND CONSERVATION BUFFER';
    spatialLabel = 'Eco-Sensitive Waterbody Zone';
  } else if (normalized.includes('river') || normalized.includes('flood') || normalized.includes('water')) {
    spatialText = 'RIVER / FLOODPLAIN CORRIDOR (150m HFL)';
    spatialLabel = 'Hydrological Conservation Zone';
  } else if (normalized.includes('industrial') || normalized.includes('factory') || normalized.includes('growth')) {
    spatialText = 'SPECIAL INDUSTRIAL MANUFACTURING ZONE';
    spatialLabel = 'Master Plan Logistics Belt';
  }

  return {
    raw: query,
    fragments: [
      { text: featureText, type: 'FEATURE', label: featureLabel, color: '#00d4ff' },
      { text: temporalText, type: 'TEMPORAL', label: temporalLabel, color: '#f59e0b' },
      { text: spatialText, type: 'SPATIAL', label: spatialLabel, color: '#22c55e' },
    ],
  };
}

export async function queryInvestigationDataset(rawQuery: string) {
  const baseDataset = await fetchInvestigationDataset();
  const query = (rawQuery || DEFAULT_QUERY).trim();
  const normalized = query.toLowerCase();

  // Detect investigation scenario based on query keywords
  const isRoadQuery = normalized.includes('road') || normalized.includes('highway') || normalized.includes('corridor') || normalized.includes('transport') || normalized.includes('bypass');
  const isDemolitionQuery = normalized.includes('disappear') || normalized.includes('demolish') || normalized.includes('clear') || normalized.includes('removal') || normalized.includes('lake') || normalized.includes('marsh') || normalized.includes('wetland');
  const isGrowthQuery = !isDemolitionQuery && !isRoadQuery && (normalized.includes('growth') || normalized.includes('major') || normalized.includes('industrial') || normalized.includes('factory') || normalized.includes('warehouse'));
  
  // Detect city mentions across Tamil Nadu
  let cityCoords: [number, number] | null = null;
  let cityName = '';
  if (normalized.includes('madurai')) { cityCoords = [78.1198, 9.9252]; cityName = 'Madurai'; }
  else if (normalized.includes('coimbatore')) { cityCoords = [76.9558, 11.0168]; cityName = 'Coimbatore'; }
  else if (normalized.includes('kancheepuram') || normalized.includes('kanchipuram')) { cityCoords = [79.7036, 12.8342]; cityName = 'Kancheepuram'; }
  else if (normalized.includes('salem')) { cityCoords = [78.1460, 11.6643]; cityName = 'Salem'; }
  else if (normalized.includes('trichy') || normalized.includes('tiruchirappalli')) { cityCoords = [78.7047, 10.7905]; cityName = 'Tiruchirappalli'; }

  let candidates: GeoCandidate[] = [];
  let changeEvents: ChangeEvent[] = [];
  let temporalStates: Record<string, SiteRecord> = {};
  let center: [number, number] = [80.237, 13.0185];
  let zoom = 14.5;
  let regionName = 'Chennai Adyar River Basin';

  if (isRoadQuery) {
    center = cityCoords || [79.945, 12.975];
    regionName = cityCoords ? `${cityName} Highway Development Corridor` : 'Sriperumbudur - Walajapet Industrial Highway Corridor (NH-48)';
    zoom = 13.8;

    candidates = [
      {
        id: 'cand-rd-001',
        featureId: 'RD-SPB-2024-001',
        name: 'Site R-01 — Sriperumbudur Highway Logistics Interchange',
        coordinates: [center[0], center[1]],
        river: 'National Highway Corridor',
        score: 0.96,
        status: 'candidate' as const,
        properties: {
          id: 'cand-rd-001',
          featureId: 'RD-SPB-2024-001',
          locality: cityCoords ? cityName : 'Sriperumbudur, Tamil Nadu',
          area_sqm: 8400,
          status: 'candidate',
          score: 0.96,
          height: 12,
          zoning: 'Highway Logistics & Right-of-Way Buffer',
          riskLevel: 'PERIPHERAL_LOGISTICS_GROWTH',
        },
      },
      {
        id: 'cand-rd-002',
        featureId: 'RD-SPB-2024-002',
        name: 'Site R-02 — Vandalur-Minjur Outer Ring Road Arterial Link',
        coordinates: [center[0] + 0.018, center[1] - 0.012],
        river: 'Outer Ring Corridor',
        score: 0.91,
        status: 'candidate' as const,
        properties: {
          id: 'cand-rd-002',
          featureId: 'RD-SPB-2024-002',
          locality: 'Outer Ring Road Belt',
          area_sqm: 6200,
          status: 'candidate',
          score: 0.91,
          height: 8,
          zoning: 'Transport Infrastructure',
        },
      },
      {
        id: 'cand-rd-003',
        featureId: 'RD-SPB-2024-003',
        name: 'Site R-03 — Poonamallee Bypass Link Road Four-Lane Extension',
        coordinates: [center[0] - 0.015, center[1] + 0.014],
        river: 'Bypass Expansion Zone',
        score: 0.87,
        status: 'candidate' as const,
        properties: {
          id: 'cand-rd-003',
          featureId: 'RD-SPB-2024-003',
          locality: 'Poonamallee Corridor',
          area_sqm: 4900,
          status: 'candidate',
          score: 0.87,
          height: 6,
          zoning: 'Arterial Transport',
        },
      },
    ];

    const rdEvent: ChangeEvent = {
      id: 'chg-rd-001',
      featureId: 'RD-SPB-2024-001',
      siteId: 'cand-rd-001',
      title: 'Four-Lane Expressway Embankment & Bituminous Surfacing Expansion',
      locality: cityCoords ? cityName : 'Sriperumbudur Logistics Corridor',
      river: 'National Highway Alignment',
      type: 'expansion',
      confidence: 0.96,
      interval: '2021-03-10 to 2024-05-15',
      intervalHuman: '3 years 2 months',
      regulatoryClassification: 'Highway Right-of-Way (RoW) Clearance and Pavement Extension',
      verified: true,
      beforeObservation: {
        id: 'obs-rd-before',
        year: 2020,
        date: '2020-03-15',
        source: 'Sentinel-2 MSI Surface Reflectance',
        sensor: 'Sentinel-2B (MSI)',
        hasFeature: false,
      },
      afterObservation: {
        id: 'obs-rd-after',
        year: 2024,
        date: '2024-05-15',
        source: 'Sentinel-2 MSI Surface Reflectance',
        sensor: 'Sentinel-2A (MSI)',
        hasFeature: true,
      },
      extent: {
        area: 8400,
        unit: 'sqm',
        floors: 2,
      },
    };
    changeEvents = [rdEvent];

    temporalStates['cand-rd-001'] = {
      siteId: 'cand-rd-001',
      name: 'Site R-01 — Sriperumbudur Highway Logistics Interchange',
      coordinates: [center[0], center[1]],
      river: 'Highway Alignment',
      riverProximityM: 0,
      statesByYear: {
        '2020': {
          status: 'pre_construction',
          description: 'Rural agricultural scrubland along original two-lane highway alignment.',
          surfaceType: 'soil_vegetation',
          builtAreaSqm: 0,
          spectralNDBI: -0.18,
          spectralNDVI: 0.46,
          floodVulnerability: 'LOW',
        },
        '2022': {
          status: 'earthworks_grading',
          description: 'Sub-base soil compaction, heavy earthworks, cleared corridor embankment.',
          surfaceType: 'cleared_graded_gravel',
          builtAreaSqm: 3100,
          spectralNDBI: 0.22,
          spectralNDVI: 0.14,
          floodVulnerability: 'LOW',
        },
        '2024': {
          status: 'asphalt_paved',
          description: 'Dual-carriageway bitumen paving completed with reinforced interchange bridges.',
          surfaceType: 'bituminous_asphalt_concrete',
          builtAreaSqm: 8400,
          spectralNDBI: 0.61,
          spectralNDVI: 0.08,
          floodVulnerability: 'LOW',
        },
        '2026': {
          status: 'operational_arterial',
          description: 'Fully operational expressway corridor with service roads and sound barriers.',
          surfaceType: 'dense_impervious_transport',
          builtAreaSqm: 8400,
          spectralNDBI: 0.63,
          spectralNDVI: 0.07,
          floodVulnerability: 'LOW',
        },
      },
    };
  } else if (isDemolitionQuery) {
    center = cityCoords || [80.218, 12.935];
    regionName = cityCoords ? `${cityName} Waterbody Restoration Zone` : 'Pallikaranai Marsh & Velachery Lake Conservation Basin';
    zoom = 14.2;

    candidates = [
      {
        id: 'cand-dm-001',
        featureId: 'DM-PLK-2024-001',
        name: 'Site D-01 — Pallikaranai Marsh Wetland Restoration Parcel',
        coordinates: [center[0], center[1]],
        river: 'Pallikaranai Marshland Basin',
        score: 0.97,
        status: 'candidate' as const,
        properties: {
          id: 'cand-dm-001',
          featureId: 'DM-PLK-2024-001',
          locality: cityCoords ? cityName : 'Pallikaranai, Chennai',
          area_sqm: 4200,
          status: 'candidate',
          score: 0.97,
          height: 10,
          zoning: 'Protected Wetland / Eco-Sensitive Zone',
          riskLevel: 'RESTORED_WATERBODY',
        },
      },
      {
        id: 'cand-dm-002',
        featureId: 'DM-PLK-2024-002',
        name: 'Site D-02 — Velachery Lake North Embankment Cleared Structures',
        coordinates: [center[0] + 0.012, center[1] + 0.018],
        river: 'Velachery Lake Inflow Channel',
        score: 0.92,
        status: 'candidate' as const,
        properties: {
          id: 'cand-dm-002',
          featureId: 'DM-PLK-2024-002',
          locality: 'Velachery North',
          area_sqm: 3100,
          status: 'candidate',
          score: 0.92,
          height: 6,
        },
      },
      {
        id: 'cand-dm-003',
        featureId: 'DM-PLK-2024-003',
        name: 'Site D-03 — Otteri Nullah Canal Edge Desiltation Removal Zone',
        coordinates: [center[0] + 0.025, center[1] + 0.045],
        river: 'Otteri Nullah Channel',
        score: 0.86,
        status: 'candidate' as const,
        properties: {
          id: 'cand-dm-003',
          featureId: 'DM-PLK-2024-003',
          locality: 'Otteri Basin',
          area_sqm: 2300,
          status: 'candidate',
          score: 0.86,
          height: 5,
        },
      },
    ];

    const dmEvent: ChangeEvent = {
      id: 'chg-dm-001',
      featureId: 'DM-PLK-2024-001',
      siteId: 'cand-dm-001',
      title: 'Unauthorized Structure Demolition & Wetland Ecological Restoration',
      locality: cityCoords ? cityName : 'Pallikaranai Marshland',
      river: 'Pallikaranai Basin',
      type: 'disappearance',
      confidence: 0.97,
      interval: '2020-02-12 to 2024-02-28',
      intervalHuman: '4 years 0 months',
      regulatoryClassification: 'High Court Mandated Wetland Encroachment Clearance & Eco-Restoration',
      verified: true,
      beforeObservation: {
        id: 'obs-dm-before',
        year: 2020,
        date: '2020-02-12',
        source: 'Sentinel-2 MSI Surface Reflectance',
        sensor: 'Sentinel-2B (MSI)',
        hasFeature: true,
      },
      afterObservation: {
        id: 'obs-dm-after',
        year: 2024,
        date: '2024-02-28',
        source: 'Sentinel-2 MSI Surface Reflectance',
        sensor: 'Sentinel-2A (MSI)',
        hasFeature: false,
      },
      extent: {
        area: 4200,
        unit: 'sqm',
        floors: 0,
      },
    };
    changeEvents = [dmEvent];

    temporalStates['cand-dm-001'] = {
      siteId: 'cand-dm-001',
      name: 'Site D-01 — Pallikaranai Marsh Wetland Restoration Parcel',
      coordinates: [center[0], center[1]],
      river: 'Pallikaranai Basin',
      riverProximityM: 10,
      statesByYear: {
        '2020': {
          status: 'unauthorized_masonry',
          description: 'Active unauthorized commercial sheds and scrap yards encroaching wetland boundary.',
          surfaceType: 'masonry_sheet_metal',
          builtAreaSqm: 4200,
          spectralNDBI: 0.52,
          spectralNDVI: 0.08,
          floodVulnerability: 'EXTREME_ENCROACHMENT',
        },
        '2022': {
          status: 'demolition_notice',
          description: 'Eviction order executed by Revenue Dept. Perimeter fencing demolished.',
          surfaceType: 'demolition_rubble',
          builtAreaSqm: 1900,
          spectralNDBI: 0.24,
          spectralNDVI: 0.16,
          floodVulnerability: 'HIGH',
        },
        '2024': {
          status: 'completely_cleared',
          description: 'Structures completely razed, debris removed, native marsh grasses planted.',
          surfaceType: 'wetland_reed_grass',
          builtAreaSqm: 0,
          spectralNDBI: -0.38,
          spectralNDVI: 0.62,
          floodVulnerability: 'RESTORED_BASIN',
        },
        '2026': {
          status: 'natural_marsh_regrowth',
          description: 'Fully restored wetland sanctuary with deep open water retention pools.',
          surfaceType: 'perennial_water_reeds',
          builtAreaSqm: 0,
          spectralNDBI: -0.42,
          spectralNDVI: 0.68,
          floodVulnerability: 'SAFE_CONSERVATION',
        },
      },
    };
  } else if (isGrowthQuery) {
    center = cityCoords || [79.925, 12.835];
    regionName = cityCoords ? `${cityName} Industrial Corridor` : 'Oragadam - Sriperumbudur High-Volume Manufacturing Belt';
    zoom = 13.9;

    candidates = [
      {
        id: 'cand-gw-001',
        featureId: 'GW-ORG-2024-001',
        name: 'Site G-01 — Oragadam Auto Corridor Megafactory Wing',
        coordinates: [center[0], center[1]],
        river: 'Industrial Corridor Zone',
        score: 0.98,
        status: 'candidate' as const,
        properties: {
          id: 'cand-gw-001',
          featureId: 'GW-ORG-2024-001',
          locality: cityCoords ? cityName : 'Oragadam, Sriperumbudur',
          area_sqm: 12500,
          status: 'candidate',
          score: 0.98,
          height: 18,
          zoning: 'SIPCOT Industrial Zone',
          riskLevel: 'HIGH_VOLUME_EXPANSION',
        },
      },
      {
        id: 'cand-gw-002',
        featureId: 'GW-ORG-2024-002',
        name: 'Site G-02 — Siruseri SIPCOT Phase II Assembly Facility',
        coordinates: [center[0] + 0.025, center[1] - 0.015],
        river: 'SIPCOT IT Belt',
        score: 0.93,
        status: 'candidate' as const,
        properties: {
          id: 'cand-gw-002',
          featureId: 'GW-ORG-2024-002',
          locality: 'Siruseri Sector 3',
          area_sqm: 9800,
          status: 'candidate',
          score: 0.93,
          height: 22,
        },
      },
      {
        id: 'cand-gw-003',
        featureId: 'GW-ORG-2024-003',
        name: 'Site G-03 — Vallam-Vadagal Electronics Manufacturing Hub',
        coordinates: [center[0] - 0.018, center[1] + 0.022],
        river: 'Vallam Industrial Belt',
        score: 0.89,
        status: 'candidate' as const,
        properties: {
          id: 'cand-gw-003',
          featureId: 'GW-ORG-2024-003',
          locality: 'Vallam Vadagal',
          area_sqm: 7600,
          status: 'candidate',
          score: 0.89,
          height: 16,
        },
      },
    ];

    const gwEvent: ChangeEvent = {
      id: 'chg-gw-001',
      featureId: 'GW-ORG-2024-001',
      siteId: 'cand-gw-001',
      title: '12,500 m² High-Volume Assembly Facility Footprint Expansion',
      locality: cityCoords ? cityName : 'Oragadam Industrial Corridor',
      river: 'Manufacturing Logistics Belt',
      type: 'expansion',
      confidence: 0.98,
      interval: '2021-08-15 to 2024-04-10',
      intervalHuman: '2 years 8 months',
      regulatoryClassification: 'Approved Industrial Master Plan with Mandatory Retention Basins',
      verified: true,
      beforeObservation: {
        id: 'obs-gw-before',
        year: 2020,
        date: '2020-08-15',
        source: 'Sentinel-2 MSI Surface Reflectance',
        sensor: 'Sentinel-2B (MSI)',
        hasFeature: false,
      },
      afterObservation: {
        id: 'obs-gw-after',
        year: 2024,
        date: '2024-04-10',
        source: 'Sentinel-2 MSI Surface Reflectance',
        sensor: 'Sentinel-2A (MSI)',
        hasFeature: true,
      },
      extent: {
        area: 12500,
        unit: 'sqm',
        floors: 3,
      },
    };
    changeEvents = [gwEvent];

    temporalStates['cand-gw-001'] = {
      siteId: 'cand-gw-001',
      name: 'Site G-01 — Oragadam Auto Corridor Megafactory Wing',
      coordinates: [center[0], center[1]],
      river: 'Industrial Zone',
      riverProximityM: 350,
      statesByYear: {
        '2020': {
          status: 'vacant_graded_plot',
          description: 'Zoned industrial plot with graded gravel subgrade and boundary trenching.',
          surfaceType: 'bare_gravel',
          builtAreaSqm: 0,
          spectralNDBI: 0.08,
          spectralNDVI: 0.22,
          floodVulnerability: 'LOW',
        },
        '2022': {
          status: 'steel_frame_erection',
          description: 'Erection of pre-engineered structural steel frames and perimeter retaining walls.',
          surfaceType: 'structural_steel_foundation',
          builtAreaSqm: 5400,
          spectralNDBI: 0.36,
          spectralNDVI: 0.11,
          floodVulnerability: 'LOW',
        },
        '2024': {
          status: 'fully_enclosed_plant',
          description: 'Fully roofed assembly bay with rooftop solar installation and concrete loading bays.',
          surfaceType: 'galvanized_steel_roofing',
          builtAreaSqm: 12500,
          spectralNDBI: 0.64,
          spectralNDVI: 0.05,
          floodVulnerability: 'LOW',
        },
        '2026': {
          status: 'operational_logistics_hub',
          description: 'High-density operational logistics complex with continuous automated dispatch.',
          surfaceType: 'dense_industrial_roofing',
          builtAreaSqm: 12500,
          spectralNDBI: 0.65,
          spectralNDVI: 0.04,
          floodVulnerability: 'LOW',
        },
      },
    };
  } else if (cityCoords) {
    // City-specific query in Tamil Nadu
    center = cityCoords;
    regionName = `${cityName} Metropolitan Region & Water Basin`;
    zoom = 14.0;

    candidates = [
      {
        id: 'cand-ct-001',
        featureId: `CT-${cityName.toUpperCase().slice(0, 3)}-001`,
        name: `Site 01 — ${cityName} Central Riverbank Commercial Cluster`,
        coordinates: [center[0], center[1]],
        river: `${cityName} River Basin`,
        score: 0.95,
        status: 'candidate' as const,
        properties: {
          id: 'cand-ct-001',
          featureId: `CT-${cityName.toUpperCase().slice(0, 3)}-001`,
          locality: cityName,
          area_sqm: 4800,
          status: 'candidate',
          score: 0.95,
          height: 16,
          zoning: 'River Floodplain Buffer',
          riskLevel: 'CRITICAL_ENCROACHMENT',
        },
      },
      {
        id: 'cand-ct-002',
        featureId: `CT-${cityName.toUpperCase().slice(0, 3)}-002`,
        name: `Site 02 — ${cityName} Ring Road Logistics Warehouse`,
        coordinates: [center[0] + 0.015, center[1] - 0.012],
        river: 'Arterial Ring Road',
        score: 0.89,
        status: 'candidate' as const,
        properties: {
          id: 'cand-ct-002',
          locality: cityName,
          area_sqm: 3500,
          status: 'candidate',
          score: 0.89,
          height: 11,
        },
      },
    ];

    const ctEvent: ChangeEvent = {
      id: 'chg-ct-001',
      featureId: `CT-${cityName.toUpperCase().slice(0, 3)}-001`,
      siteId: 'cand-ct-001',
      title: `New Commercial Structure in ${cityName} Floodplain Buffer`,
      locality: cityName,
      river: `${cityName} River Basin`,
      type: 'appearance',
      confidence: 0.95,
      interval: '2021-01-10 to 2024-03-15',
      intervalHuman: '3 years 2 months',
      regulatoryClassification: `Encroachment in ${cityName} Conservation Buffer Zone`,
      verified: true,
      beforeObservation: {
        id: 'obs-ct-before',
        year: 2020,
        date: '2020-01-10',
        source: 'Sentinel-2 MSI Surface Reflectance',
        sensor: 'Sentinel-2B (MSI)',
        hasFeature: false,
      },
      afterObservation: {
        id: 'obs-ct-after',
        year: 2024,
        date: '2024-03-15',
        source: 'Sentinel-2 MSI Surface Reflectance',
        sensor: 'Sentinel-2A (MSI)',
        hasFeature: true,
      },
      extent: {
        area: 4800,
        unit: 'sqm',
        floors: 4,
      },
    };
    changeEvents = [ctEvent];

    temporalStates['cand-ct-001'] = {
      siteId: 'cand-ct-001',
      name: `Site 01 — ${cityName} Central Riverbank Commercial Cluster`,
      coordinates: [center[0], center[1]],
      river: `${cityName} River Basin`,
      riverProximityM: 85,
      statesByYear: {
        '2020': {
          status: 'vacant_riparian',
          description: `Natural riparian vegetation along ${cityName} riverbank.`,
          surfaceType: 'riparian_vegetation',
          builtAreaSqm: 0,
          spectralNDBI: -0.15,
          spectralNDVI: 0.52,
          floodVulnerability: 'HIGH',
        },
        '2024': {
          status: 'built_commercial',
          description: `Multi-story commercial complex with basement parking in ${cityName}.`,
          surfaceType: 'reinforced_concrete',
          builtAreaSqm: 4800,
          spectralNDBI: 0.58,
          spectralNDVI: 0.09,
          floodVulnerability: 'CRITICAL',
        },
      },
    };
  } else {
    // Default Chennai River Encroachments
    candidates = buildCandidateSitesFromFeatures(baseDataset.features);
    changeEvents = baseDataset.changeEvents;
    temporalStates = baseDataset.temporalStates;
    center = [80.237, 13.0185];
    regionName = 'Chennai Adyar River Floodplain Corridor';
    zoom = 14.5;
  }

  const selectedCandidate = candidates[0] || null;

  // Synthesize rich dataset for the orchestrator
  const dataset: LocalInvestigationDataset = {
    sites: baseDataset.sites || baseDataset.features,
    observations: baseDataset.observations || [],
    manifest: {
      name: `GeoChronos Investigation — ${regionName}`,
      version: '2.4.0',
      classification: 'OFFICIAL ANALYST SESSION',
      aoi: regionName,
      center,
      bounds: [center[0] - 0.05, center[1] - 0.05, center[0] + 0.05, center[1] + 0.05],
      temporalRange: {
        start: '2020-01-01',
        end: '2026-03-31',
        keyEpochs: [2020, 2022, 2024, 2026],
      },
      queryCapabilities: ['feature_extraction', 'temporal_change', 'spatial_buffer', 'false_signal_audit'],
    },
    features: {
      type: 'FeatureCollection',
      features: candidates.map((cand, idx) => ({
        type: 'Feature',
        id: idx + 1,
        properties: {
          id: cand.id,
          name: cand.name,
          status: 'candidate',
          score: cand.score,
          height: cand.properties?.height ?? 16,
          ...cand.properties,
        },
        geometry: cand.geometry ?? {
          type: 'Polygon',
          coordinates: [
            [
              [cand.coordinates[0] - 0.0018, cand.coordinates[1] - 0.0012],
              [cand.coordinates[0] + 0.0018, cand.coordinates[1] - 0.0012],
              [cand.coordinates[0] + 0.0018, cand.coordinates[1] + 0.0012],
              [cand.coordinates[0] - 0.0018, cand.coordinates[1] + 0.0012],
              [cand.coordinates[0] - 0.0018, cand.coordinates[1] - 0.0012],
            ],
          ],
        },
      })),
    },
    temporalStates,
    changeEvents,
    evidence: baseDataset.evidence,
    provenance: baseDataset.provenance,
  };

  const queryIntent: QueryIntent = {
    ...buildQueryIntentFromText(query),
    spatialConstraint: {
      type: 'intersects',
      geometry: { type: 'Point', coordinates: center },
      properties: { name: regionName },
    },
    relationship: 'within_150m_buffer',
  };

  return {
    dataset,
    candidates,
    center,
    zoom,
    queryIntent,
    selectedCandidate,
  };
}

export interface ManifestData {
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
}

const asFeatureCenter = (feature: GeoJSON.Feature): [number, number] => {
  const geometry = feature.geometry;
  if (!geometry) return [0, 0];
  if (geometry.type === 'Point') return geometry.coordinates as [number, number];
  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    const ring = geometry.type === 'Polygon' ? geometry.coordinates[0] : geometry.coordinates[0][0];
    const total = ring.reduce(
      (sum, [lng, lat]) => [sum[0] + lng, sum[1] + lat] as [number, number],
      [0, 0] as [number, number]
    );
    const count = ring.length || 1;
    return [total[0] / count, total[1] / count];
  }
  return [0, 0];
};

export function buildCandidateSitesFromFeatures(features: GeoJSON.FeatureCollection): GeoCandidate[] {
  return (features.features ?? []).map((feature) => {
    const props = feature.properties ?? {};
    const center = asFeatureCenter(feature);
    return {
      id: String(props.id ?? feature.id ?? 'unknown-candidate'),
      featureId: String(props.featureId ?? props.id ?? 'unknown-feature'),
      name: String(props.name ?? 'Unlabeled Site'),
      coordinates: center,
      river: String(props.river ?? 'Adyar River'),
      score: Number(props.score ?? 0.85),
      status: 'candidate' as const,
      geometry: feature.geometry,
      properties: props,
    };
  });
}

export async function fetchInvestigationDataset(): Promise<LocalInvestigationDataset> {
  const [manifestRes, featuresRes, statesRes, eventsRes, evidenceRes, provRes] = await Promise.all([
    fetch('/data/geochronos-demo/manifest.json'),
    fetch('/data/geochronos-demo/features.geojson'),
    fetch('/data/geochronos-demo/temporal_states.json'),
    fetch('/data/geochronos-demo/change_events.json'),
    fetch('/data/geochronos-demo/evidence.json'),
    fetch('/data/geochronos-demo/provenance.json'),
  ]);

  const [manifest, features, temporalStates, changeEvents, evidence, provenance] = await Promise.all([
    manifestRes.json(),
    featuresRes.json(),
    statesRes.json(),
    eventsRes.json(),
    evidenceRes.json(),
    provRes.json(),
  ]);

  return {
    manifest,
    sites: features,
    observations: [],
    features,
    temporalStates,
    changeEvents: changeEvents.map((event: any) => ({
      ...event,
      beforeObservation: {
        id: `${event.id}-before`,
        year: parseEventDate(event.interval, 0).getFullYear() || 2020,
        date: parseEventDate(event.interval, 0).toISOString().slice(0, 10),
        source: 'GeoChronos local change-event record',
        sensor: 'Sentinel-2B (MSI)',
        hasFeature: event.type === 'expansion' || event.type === 'persistence',
      },
      afterObservation: {
        id: `${event.id}-after`,
        year: parseEventDate(event.interval, 1).getFullYear() || 2024,
        date: parseEventDate(event.interval, 1).toISOString().slice(0, 10),
        source: 'GeoChronos local change-event record',
        sensor: 'Sentinel-2A (MSI)',
        hasFeature: event.type !== 'disappearance',
      },
      extent: {
        area: event.extent?.areaSqm ?? 3450,
        unit: 'sqm',
        floors: event.extent?.floors ?? 3,
        heightM: event.extent?.heightM ?? 15,
      },
      verified: Boolean(event.verified ?? true),
    })),
    evidence,
    provenance,
  };
}

export async function fetchRivers(): Promise<GeoJSON.FeatureCollection> {
  const res = await fetch('/data/geochronos-demo/rivers.geojson');
  return res.json();
}

export async function fetchSites(): Promise<GeoJSON.FeatureCollection> {
  const res = await fetch('/data/geochronos-demo/sites.geojson');
  return res.json();
}

export async function fetchFeatures(): Promise<GeoJSON.FeatureCollection> {
  const res = await fetch('/data/geochronos-demo/features.geojson');
  return res.json();
}

export async function fetchObservations(): Promise<TemporalObservation[]> {
  const res = await fetch('/data/geochronos-demo/observations.json');
  const data = await res.json();
  return data.map((o: any) => ({
    id: o.id,
    year: o.year,
    date: o.date,
    source: o.source,
    sensor: o.sensor,
    hasFeature: o.year >= 2024,
    notes: o.notes,
  }));
}

export async function fetchTemporalStates(): Promise<Record<string, SiteRecord>> {
  const res = await fetch('/data/geochronos-demo/temporal_states.json');
  return res.json();
}

export async function fetchChangeEvents(): Promise<ChangeEvent[]> {
  const res = await fetch('/data/geochronos-demo/change_events.json');
  const data = await res.json();
  return data.map((event: any) => ({
    id: event.id,
    type: event.type as ChangeEvent['type'],
    title: event.title,
    siteId: event.siteId,
    featureId: event.featureId,
    locality: event.locality,
    river: event.river,
    riverProximityM: event.riverProximityM,
    interval: event.interval,
    intervalHuman: event.intervalHuman,
    regulatoryClassification: event.regulatoryClassification,
    spectralChange: event.spectralChange,
    radarChange: event.radarChange,
    beforeObservation: {
      id: `${event.id}-before`,
      year: parseEventDate(event.interval, 0).getFullYear() || 2020,
      date: parseEventDate(event.interval, 0).toISOString().slice(0, 10),
      source: 'GeoChronos local change-event record',
      sensor: 'Sentinel-2B (MSI)',
      hasFeature: event.type === 'expansion' || event.type === 'persistence',
    },
    afterObservation: {
      id: `${event.id}-after`,
      year: parseEventDate(event.interval, 1).getFullYear() || 2024,
      date: parseEventDate(event.interval, 1).toISOString().slice(0, 10),
      source: 'GeoChronos local change-event record',
      sensor: 'Sentinel-2A (MSI)',
      hasFeature: event.type !== 'disappearance',
    },
    confidence: event.confidence,
    extent: {
      area: event.extent.areaSqm,
      unit: 'sqm',
      floors: event.extent.floors,
      heightM: event.extent.heightM,
    },
    verified: Boolean(event.verified),
  }));
}

export function findChangeEventForCandidate(
  events: ChangeEvent[],
  candidate: GeoCandidate,
): ChangeEvent | null {
  const candidateFeatureId = String(candidate.properties?.featureId ?? candidate.featureId ?? '');
  const candidateSiteId = String(candidate.properties?.siteId ?? candidate.id ?? '');
  const found = events.find((event) => event.featureId === candidateFeatureId || Boolean(candidateSiteId && event.siteId === candidateSiteId));
  if (found) return found;
  if (events.length > 0) return events[0];
  return null;
}

export function filterProvenanceForCandidate(
  nodes: ProvenanceNode[],
  candidate: GeoCandidate,
  event: ChangeEvent | null,
): ProvenanceNode[] {
  if (!event) return nodes.slice(0, 5);
  const terms = [event.id, event.featureId, event.siteId, candidate.name, String(candidate.properties?.locality ?? '')]
    .filter(Boolean)
    .map((term) => String(term).toLowerCase());
  const relevant = nodes.filter((node) => {
    const text = `${node.label} ${node.detail}`.toLowerCase();
    return terms.some((term) => text.includes(term));
  });
  return relevant.length > 0 ? relevant : nodes.slice(0, 5);
}

function parseEventDate(interval: string, index: number): Date {
  const dates = String(interval ?? '').match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  return new Date(dates[index] ?? '2022-01-01');
}

export function getTemporalStatesForSite(
  temporalStates: Record<string, SiteRecord>,
  siteId: string | undefined,
  featureId: string | undefined,
): TemporalStateRecord[] {
  const site = Object.values(temporalStates).find((record) => record.siteId === siteId || record.siteId === featureId);
  if (!site) {
    // Generate fallback observations across 4 key epochs
    return [
      {
        siteId: siteId || 'site-01',
        featureId: featureId || 'feat-01',
        observationId: 'obs-2020',
        date: '2020-01-01',
        year: 2020,
        state: 'baseline_epoch',
        description: 'Prior epoch observation. Undisturbed terrain.',
        surfaceType: 'natural_surface',
        builtAreaSqm: 0,
        spectralNDBI: -0.12,
        spectralNDVI: 0.45,
        floodVulnerability: 'LOW',
        geometry: null,
      },
      {
        siteId: siteId || 'site-01',
        featureId: featureId || 'feat-01',
        observationId: 'obs-2022',
        date: '2022-01-01',
        year: 2022,
        state: 'intermediate_epoch',
        description: 'Site preparation and physical structure emergence detected.',
        surfaceType: 'disturbed_soil',
        builtAreaSqm: 2400,
        spectralNDBI: 0.28,
        spectralNDVI: 0.21,
        floodVulnerability: 'MODERATE',
        geometry: null,
      },
      {
        siteId: siteId || 'site-01',
        featureId: featureId || 'feat-01',
        observationId: 'obs-2024',
        date: '2024-01-01',
        year: 2024,
        state: 'verified_change',
        description: 'Confirmed completed footprint visible in Sentinel-2 MSI multispectral imagery.',
        surfaceType: 'impervious_built',
        builtAreaSqm: 4800,
        spectralNDBI: 0.62,
        spectralNDVI: 0.08,
        floodVulnerability: 'HIGH',
        geometry: null,
      },
      {
        siteId: siteId || 'site-01',
        featureId: featureId || 'feat-01',
        observationId: 'obs-2026',
        date: '2026-01-01',
        year: 2026,
        state: 'persistent_state',
        description: 'Persistent operational footprint documented in authoritative timeline.',
        surfaceType: 'impervious_built',
        builtAreaSqm: 4800,
        spectralNDBI: 0.64,
        spectralNDVI: 0.07,
        floodVulnerability: 'HIGH',
        geometry: null,
      },
    ];
  }

  return Object.entries(site.statesByYear).map(([year, state]) => ({
    siteId: site.siteId,
    featureId: featureId ?? site.siteId,
    observationId: `${site.siteId}-${year}`,
    date: `${year}-01-01`,
    year: Number(year),
    state: state.status,
    description: state.description,
    surfaceType: state.surfaceType,
    builtAreaSqm: state.builtAreaSqm,
    spectralNDBI: state.spectralNDBI,
    spectralNDVI: state.spectralNDVI,
    floodVulnerability: state.floodVulnerability,
    geometry: null,
  }));
}

export function getObservationsForSite(
  observations: TemporalObservation[],
  states: TemporalStateRecord[],
): TemporalObservation[] {
  const stateYears = states.map((s) => s.year);
  if (stateYears.length === 0) return observations;
  
  return states.map((s) => ({
    id: s.observationId,
    year: s.year ?? 2024,
    date: s.date,
    source: 'Sentinel-2 MSI / Landsat-9 OLI',
    sensor: 'Sentinel-2B (MSI)',
    hasFeature: Boolean(s.builtAreaSqm && s.builtAreaSqm > 0),
    notes: s.description,
  }));
}

export function buildChangeExplanation(
  candidate: GeoCandidate,
  event: ChangeEvent,
  states: TemporalStateRecord[],
): ChangeExplanation {
  const beforeState = states.find((state) => state.year === event.beforeObservation.year);
  const afterState = states.find((state) => state.year === event.afterObservation.year);
  const beforeLabel = beforeState?.description ?? 'Pre-change baseline state documented in multispectral time-series.';
  const afterLabel = afterState?.description ?? event.title ?? 'Change event confirmed in local dataset.';

  return {
    what: event.title ?? `${event.type} detected`,
    where: `${candidate.name}${event.river ? `, ${event.river}` : ''}${event.locality ? `, ${event.locality}` : ''}`,
    when: event.intervalHuman ?? event.interval ?? `${event.beforeObservation.year}–${event.afterObservation.year}`,
    extent: `${event.extent.area.toLocaleString()} ${event.extent.unit}${event.extent.floors ? `, ${event.extent.floors} floors` : ''}`,
    previousState: beforeLabel,
    currentState: afterLabel,
    narrative: `${event.title ?? 'A change event'} was documented for ${candidate.name}. ${event.regulatoryClassification ?? 'Ground-truth evidence verified via multi-temporal Sentinel-2 and radar observation analysis.'}`,
    confidence: event.confidence,
  };
}

export async function fetchEvidence(
  changeEvent: ChangeEvent,
  candidate: GeoCandidate,
): Promise<EvidenceItem> {
  let ev: any = null;
  try {
    const res = await fetch('/data/geochronos-demo/evidence.json');
    const data = await res.json();
    ev = data[changeEvent.id];
  } catch {
    // fallback
  }

  const beforeDate = changeEvent.beforeObservation?.date || '2020-03-15';
  const afterDate = changeEvent.afterObservation?.date || '2024-05-15';
  const beforeSensor = changeEvent.beforeObservation?.sensor || 'Sentinel-2B (MSI)';
  const afterSensor = changeEvent.afterObservation?.sensor || 'Sentinel-2A (MSI)';

  return {
    id: ev?.id ?? `evidence-${changeEvent.id}`,
    changeEventId: changeEvent.id,
    targetSite: candidate.name,
    location: {
      latitude: candidate.coordinates[1],
      longitude: candidate.coordinates[0],
      lng: candidate.coordinates[0],
      lat: candidate.coordinates[1],
    },
    epochBefore: ev?.epochBefore ?? {
      date: beforeDate,
      sensor: beforeSensor,
      cloudCover: '0.2%',
      sunElevation: '58.4°',
      imageUrl: '/fixtures/chennai_adyar_2020_pre.jpg',
    },
    epochAfter: ev?.epochAfter ?? {
      date: afterDate,
      sensor: afterSensor,
      cloudCover: '0.0%',
      sunElevation: '62.1°',
      imageUrl: '/fixtures/chennai_adyar_2024_post.jpg',
    },
    beforeImageUrl: '/fixtures/chennai_adyar_2020_pre.jpg',
    afterImageUrl: '/fixtures/chennai_adyar_2024_post.jpg',
    acquisitionBefore: `${beforeDate} (${beforeSensor})`,
    acquisitionAfter: `${afterDate} (${afterSensor})`,
    sensor: `${beforeSensor} / ${afterSensor}`,
    changeInterval: changeEvent.intervalHuman ?? changeEvent.interval ?? '2020–2024',
    changeType: changeEvent.title ?? changeEvent.type ?? 'Confirmed change',
    confidence: changeEvent.confidence ?? 0.95,
  };
}
