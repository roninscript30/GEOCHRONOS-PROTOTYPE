'use client';

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import Map, { Source, Layer, NavigationControl, Marker } from 'react-map-gl/maplibre';
import type { MapRef, LayerProps } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { setWorkerUrl } from 'maplibre-gl';
import { useInvestigationStore } from '@/store/investigation';
import { INVESTIGATION_STATES } from '@/types/investigation';
import { fetchFeatures, fetchRivers } from '@/lib/dataService';

if (typeof window !== 'undefined') {
  try {
    setWorkerUrl('/maplibre-gl-worker.mjs');
  } catch {
    // Ignore if already set
  }
}

export function MapCanvas() {
  const mapRef = useRef<MapRef>(null);
  const {
    state,
    setState,
    mapViewState,
    setMapViewState,
    selectedCandidate,
    selectCandidate,
    currentYear,
    candidates,
    observations,
  } = useInvestigationStore();

  const [mapLoaded, setMapLoaded] = useState(false);


  const spatialContextType = useInvestigationStore(s => {
    const text = s.queryIntent?.fragments?.find(f => f.type === 'SPATIAL')?.text || '';
    if (text.includes('RIVER') || text.includes('FLOOD') || text.includes('WATER')) return 'river';
    if (s.queryText.toLowerCase().includes('road') || s.queryText.toLowerCase().includes('highway')) return 'road';
    return 'generic';
  });

  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | number | null>(null);
  const [imageryMode, setImageryMode] = useState<'hybrid' | 'satellite' | 'vector'>('hybrid');
  const [riverGeoJson, setRiverGeoJson] = useState<any>(null);
  const [buildingGeoJson, setBuildingGeoJson] = useState<any>(null);
  const buildingFeatures = buildingGeoJson?.features ?? [];

  // Dynamically synchronize candidate footprints on the map with active investigation candidates
  useEffect(() => {
    if (!candidates || candidates.length === 0) return;
    setBuildingGeoJson({
      type: 'FeatureCollection',
      features: candidates.map((cand, idx) => ({
        type: 'Feature',
        id: idx + 1,
        properties: {
          id: cand.id,
          name: cand.name,
          status: selectedCandidate?.id === cand.id ? 'selected' : 'candidate',
          score: cand.score,
          height: cand.properties?.height ?? 18,
          ...cand.properties,
        },
        geometry: cand.geometry ?? {
          type: 'Polygon',
          coordinates: [
            [
              [cand.coordinates[0] - 0.002, cand.coordinates[1] - 0.0012],
              [cand.coordinates[0] + 0.002, cand.coordinates[1] - 0.0012],
              [cand.coordinates[0] + 0.002, cand.coordinates[1] + 0.0012],
              [cand.coordinates[0] - 0.002, cand.coordinates[1] + 0.0012],
              [cand.coordinates[0] - 0.002, cand.coordinates[1] - 0.0012],
            ],
          ],
        },
      })),
    });

    // Also synchronize the spatial context corridor (rivers / roads / buffers) to the active location
    const center = selectedCandidate?.coordinates || candidates[0].coordinates;
    const isRoad = spatialContextType === 'road';
    setRiverGeoJson({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'context-corridor-primary',
          properties: {
            name: isRoad ? 'State Highway / Logistics Arterial Corridor' : 'Hydrological Buffer Corridor',
            type: spatialContextType,
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [center[0] - 0.045, center[1] - (isRoad ? 0.012 : 0.025)],
              [center[0] - 0.02, center[1] - (isRoad ? 0.005 : 0.01)],
              [center[0], center[1]],
              [center[0] + 0.022, center[1] + (isRoad ? 0.006 : 0.012)],
              [center[0] + 0.05, center[1] + (isRoad ? 0.015 : 0.028)],
            ],
          },
        },
      ],
    });
  }, [candidates, selectedCandidate, spatialContextType]);


  const stateIndex = INVESTIGATION_STATES.indexOf(state);
  const showRivers = stateIndex >= INVESTIGATION_STATES.indexOf('RIVER_SEARCH');
  const showBuildings = stateIndex >= INVESTIGATION_STATES.indexOf('BUILDINGS_APPEAR');
  const showScores = stateIndex >= INVESTIGATION_STATES.indexOf('CANDIDATES_APPEAR');
  const currentObs = observations.find((o) => o.year === currentYear);
  const isPostConstruction = currentObs ? currentObs.hasFeature : currentYear >= 2024;

  const shiftedRiverGeoJson = useMemo(() => {
    if (!riverGeoJson) return null;
    if (stateIndex < INVESTIGATION_STATES.indexOf('INTENT')) return riverGeoJson;

    // The dummy river.geojson is centered around [80.23, 13.01] (Chennai).
    // If we are looking elsewhere, translate the rivers to the current query intent center 
    // so the prototype looks populated anywhere.
    const centerLng = mapViewState.longitude;
    const centerLat = mapViewState.latitude;
    
    // If we are still near Chennai, don't shift
    if (Math.abs(centerLng - 80.23) < 0.2 && Math.abs(centerLat - 13.01) < 0.2) {
      return riverGeoJson;
    }

    const dLng = centerLng - 80.2385;
    const dLat = centerLat - 13.0195;

    const shiftCoords = (coords: any): any => {
      if (typeof coords[0] === 'number') {
        return [coords[0] + dLng, coords[1] + dLat];
      }
      return coords.map(shiftCoords);
    };

    return {
      ...riverGeoJson,
      features: riverGeoJson.features.map((f: any) => ({
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: shiftCoords(f.geometry.coordinates)
        }
      }))
    };
  }, [riverGeoJson, stateIndex, mapViewState.longitude, mapViewState.latitude]);


  useEffect(() => {
    if (!mapLoaded) return;
    void (async () => {
      try {
        const [rivers, features] = await Promise.all([fetchRivers(), fetchFeatures()]);
        setRiverGeoJson(rivers);
        setBuildingGeoJson({
          type: 'FeatureCollection',
          features: (features.features ?? []).map((feature: any, index: number) => ({
            ...feature,
            id: feature.id ?? index + 1,
            properties: {
              ...(feature.properties ?? {}),
              height: feature.properties?.height ?? feature.properties?.height_m ?? 15,
            },
          })),
        });
      } catch (_err) {
        // Fall back silently if local assets are unavailable in this runtime.
      }
    })();
  }, [mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current.getMap();

    if (showBuildings) {
      buildingFeatures.forEach((f: any) => {
        let status = f.properties.status || 'candidate';

        if (stateIndex >= INVESTIGATION_STATES.indexOf('SELECT_SITE') && selectedCandidate?.id === f.properties.id) {
          status = 'selected';
        }

        map.setFeatureState(
          { source: 'buildings', id: f.id },
          {
            status,
            score: showScores ? (f.properties.score || 0) : 0,
          }
        );
      });
    }
  }, [stateIndex, showBuildings, showScores, selectedCandidate, mapLoaded, buildingFeatures]);

  // Smooth camera transitions across the investigation lifecycle
  useEffect(() => {
    if (!mapRef.current) return;

    if (state === 'QUERY') {
      mapRef.current.flyTo({
        center: [80.2385, 13.0195],
        zoom: 6.5,
        pitch: 20,
        bearing: 0,
        duration: 1600,
        essential: true,
      });
      return;
    }

    if (state === 'RIVER_SEARCH' || state === 'RIVER_MAP_GENERATED') {
      const qIntent = useInvestigationStore.getState().queryIntent;
      const targetCoords = (qIntent?.spatialConstraint?.geometry?.coordinates as [number, number]) ||
        (candidates.length > 0 ? candidates[0].coordinates : [80.2385, 13.0195]);
      mapRef.current.flyTo({
        center: targetCoords,
        zoom: 12.8,
        pitch: 35,
        bearing: -10,
        duration: 2200,
        essential: true,
      });
      return;
    }

    if (
      state === 'SELECT_SITE' ||
      state === 'TIME_MACHINE' ||
      state === 'BEFORE_AFTER' ||
      state === 'CHANGE_EVENT' ||
      state === 'WHY_CHANGE' ||
      state === 'VERIFICATION' ||
      state === 'EVIDENCE'
    ) {
      const cand = selectedCandidate || (candidates.length > 0 ? candidates[0] : null);
      if (cand) {
        mapRef.current.flyTo({
          center: cand.coordinates,
          zoom: 16.5,
          pitch: 62,
          bearing: 35,
          duration: 2200,
          essential: true,
        });
      }
      return;
    }
  }, [state, selectedCandidate, candidates]);

  const onMouseMove = useCallback((e: any) => {
    if (e.features && e.features.length > 0) {
      const featureId = e.features[0].id;
      if (hoveredFeatureId !== featureId) {
        if (hoveredFeatureId !== null && mapRef.current) {
          mapRef.current.setFeatureState(
            { source: 'buildings', id: hoveredFeatureId },
            { hover: false }
          );
        }
        setHoveredFeatureId(featureId);
        if (mapRef.current) {
          mapRef.current.setFeatureState(
            { source: 'buildings', id: featureId },
            { hover: true }
          );
        }
      }
    } else if (hoveredFeatureId !== null) {
      if (mapRef.current) {
        mapRef.current.setFeatureState(
          { source: 'buildings', id: hoveredFeatureId },
          { hover: false }
        );
      }
      setHoveredFeatureId(null);
    }
  }, [hoveredFeatureId]);

  const onClick = useCallback((e: any) => {
    if (e.features && e.features.length > 0) {
      const bldgId = e.features[0].properties.id;
      const candidate = candidates.find((c) => c.id === bldgId);
      if (candidate) {
        selectCandidate(candidate);
        setState('SELECT_SITE');
      }
    }
  }, [candidates, selectCandidate, setState]);

  // Satellite Imagery Layer Specification (Esri World Imagery)
  const satelliteLayerStyle: LayerProps = useMemo(() => ({
    id: 'esri-satellite-imagery',
    type: 'raster',
    paint: {
      'raster-opacity': imageryMode === 'satellite' ? 0.95 : imageryMode === 'hybrid' ? 0.75 : 0.0,
      'raster-fade-duration': 400,
    }
  }), [imageryMode]);

  // 3D Extruded Building Layer — Dynamically reacts to temporal year!
  const buildingsExtrusionStyle: LayerProps = useMemo(() => ({
    id: 'buildings-extrusion-3d',
    type: 'fill-extrusion',
    source: 'buildings',
    paint: {
      'fill-extrusion-color': [
        'case',
        ['==', ['feature-state', 'status'], 'selected'], '#00d4ff',
        ['==', ['feature-state', 'status'], 'verified'], '#22c55e',
        ['==', ['feature-state', 'status'], 'candidate'], '#f59e0b',
        '#64748b'
      ],
      'fill-extrusion-height': [
        'case',
        ['has', 'height'],
        isPostConstruction ? ['get', 'height'] : 0.1,
        isPostConstruction ? 15 : 0.1
      ],
      'fill-extrusion-base': 0,
      
    }
  }), [isPostConstruction]);

  // 2D Fill fallback for flat view
  const buildingsFillStyle: LayerProps = useMemo(() => ({
    id: 'buildings-fill',
    type: 'fill',
    source: 'buildings',
    paint: {
      'fill-color': [
        'case',
        ['==', ['feature-state', 'status'], 'selected'], '#00d4ff',
        ['==', ['feature-state', 'status'], 'verified'], '#22c55e',
        ['==', ['feature-state', 'status'], 'rejected'], '#4b5563',
        ['==', ['feature-state', 'status'], 'candidate'],
          ['case',
             ['>', ['feature-state', 'score'], 0],
             ['rgba', 245, 158, 11, ['*', ['feature-state', 'score'], 0.6]],
             'rgba(245, 158, 11, 0.3)'
          ],
        '#1f2937'
      ],
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false], 0.9,
        0.75
      ]
    }
  }), []);

  const buildingsLineStyle: LayerProps = useMemo(() => ({
    id: 'buildings-line',
    type: 'line',
    source: 'buildings',
    paint: {
      'line-color': [
        'case',
        ['==', ['feature-state', 'status'], 'candidate'], '#f59e0b',
        ['==', ['feature-state', 'status'], 'selected'], '#00d4ff',
        '#ffffff'
      ],
      'line-width': 2
    }
  }), []);

  // Chennai River Lines (Adyar, Cooum, Buckingham Canal)
  
  const riverLineStyle: LayerProps = useMemo(() => {
    let color = '#00d4ff';
    if (spatialContextType === 'road') color = '#f59e0b';
    else if (spatialContextType === 'generic') color = '#22c55e';

    return {
      id: 'rivers-line',
      source: 'rivers',
      type: 'line',
      paint: {
        'line-color': color,
        'line-width': 2,
        'line-opacity': 0.8,
      },
    };
  }, [spatialContextType]);
  

  
  

  const riverGlowStyle: LayerProps = useMemo(() => {
    let color = '#00d4ff';
    if (spatialContextType === 'road') color = '#f59e0b';
    else if (spatialContextType === 'generic') color = '#22c55e';
    
    return {
      id: 'rivers-glow',
      source: 'rivers',
      type: 'line',
      paint: {
        'line-color': color,
        'line-width': 12,
        'line-opacity': 0.15,
        'line-blur': 10,
      },
    };
  }, [spatialContextType]);
  

  return (
    <div className="absolute inset-0 w-full h-full bg-[#0a0a0f]">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 80.2385,
          latitude: 13.0195,
          zoom: 6.5,
          pitch: 30,
          bearing: 0,
        }}
        onMove={evt => setMapViewState(evt.viewState)}
        mapStyle="https://tiles.openfreemap.org/styles/dark"
        maxPitch={85}
        interactiveLayerIds={['buildings-fill', 'buildings-extrusion-3d']}
        onMouseMove={onMouseMove}
        onClick={onClick}
        onLoad={() => setMapLoaded(true)}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" />

        {/* Real High-Resolution Satellite Raster Layer (Esri World Imagery) */}
        <Source
          id="satellite-source"
          type="raster"
          tiles={[
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ]}
          tileSize={256}
          maxzoom={19}
        >
          <Layer {...satelliteLayerStyle} />
        </Source>

        {/* Subtle coordinate grid lines overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.02)_1px,transparent_1px)] bg-[size:120px_120px]" />

        {/* Local river network */}
        {showRivers && riverGeoJson && (
          <Source id="rivers" type="geojson" data={riverGeoJson}>
            <Layer {...riverGlowStyle} />
            <Layer {...riverLineStyle} />
          </Source>
        )}

        {/* Building Candidate Footprints & 3D Extrusions */}
        {showBuildings && buildingGeoJson && (
          <Source id="buildings" type="geojson" data={buildingGeoJson}>
            <Layer {...buildingsFillStyle} />
            <Layer {...buildingsLineStyle} />
            <Layer {...buildingsExtrusionStyle} />
          </Source>
        )}

        {/* Candidate Callout Pins when Candidates Appear */}
        {showScores && stateIndex < INVESTIGATION_STATES.indexOf('SELECT_SITE') && (
          candidates.slice(0, 3).map((candidate) => (
            <Marker
              key={candidate.id}
              longitude={candidate.coordinates[0]}
              latitude={candidate.coordinates[1]}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                selectCandidate(candidate);
                setState('SELECT_SITE');
              }}
            >
              <div className="cursor-pointer group flex flex-col items-center">
                <div className="px-2.5 py-1 rounded-lg border font-mono text-[10px] font-bold shadow-2xl transition-all bg-[#12121a]/95 text-[#f59e0b] border-[#f59e0b]/60 group-hover:scale-110 group-hover:border-[#00d4ff] group-hover:text-[#00d4ff] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-ping" />
                  <span>{candidate.name.split('—')[0].trim()}</span>
                  <span className="text-[#22c55e]">({Math.round(candidate.score * 100)}%)</span>
                </div>
                <span className="w-1.5 h-2 bg-[#f59e0b] rounded-b-sm" />
              </div>
            </Marker>
          ))
        )}
      </Map>

      {/* Geospatial Telemetry HUD (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 font-mono text-[10px]">
        {/* Layer Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-[#0a0a0f]/85 backdrop-blur-md p-1.5 rounded-lg border border-[#1e1e2e] shadow-xl">
          <span className="text-[#6b6b80] px-2 text-[9px] uppercase tracking-wider">SENSOR VIEW:</span>
          {(['hybrid', 'satellite', 'vector'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setImageryMode(mode)}
              className={`px-2.5 py-1 rounded text-[9px] uppercase tracking-wider transition-colors cursor-pointer ${
                imageryMode === mode 
                  ? 'bg-[#00d4ff] text-[#0a0a0f] font-bold shadow-[0_0_8px_rgba(0,212,255,0.4)]' 
                  : 'text-[#e8e8ec]/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Region & Coordinates Tag */}
        <div className="bg-[#0a0a0f]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1e1e2e] text-[#6b6b80] flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            <span className="text-[#e8e8ec] font-bold">LOCAL AOI</span>
          </div>
          <div>LAT: <span className="text-[#00d4ff]">{mapViewState.latitude.toFixed(4)}°N</span></div>
          <div>LON: <span className="text-[#00d4ff]">{mapViewState.longitude.toFixed(4)}°E</span></div>
          <div>PITCH: <span className="text-white">{Math.round(mapViewState.pitch)}°</span></div>
        </div>
      </div>
    </div>
  );
}
