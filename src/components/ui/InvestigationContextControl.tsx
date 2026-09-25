'use client';

import { useInvestigationStore } from '@/store/investigation';
import { motion, AnimatePresence } from 'motion/react';
import type { InvestigationState } from '@/types/investigation';

interface ContextAction {
  status: string;
  buttonLabel?: string;
  nextState?: InvestigationState;
  action?: () => void;
}

export function InvestigationContextControl() {
  const { state, setState, selectedCandidate, candidates, changeEvent, evidence, queryIntent } = useInvestigationStore();

  const getAction = (): ContextAction | null => {
    switch (state) {
      case 'RIVER_SEARCH':
        return {
          status: 'Querying authoritative local river baselines…',
        };
      case 'RIVER_MAP_GENERATED':
        return {
          status: queryIntent?.fragments?.find((f: any) => f.type === 'SPATIAL')?.text?.includes('RIVER') ? 'River corridors mapped with 150m High Flood Level (HFL) conservation buffer' : 'Spatial context constraints mapped to local geography',
          buttonLabel: (queryIntent?.fragments?.find((f: any) => f.type === 'FEATURE')?.text?.includes('FOOTPRINT') ? 'Discover Buildings in Buffer' : 'Discover Target Features') + ' →',
          nextState: 'BUILDING_SEARCH',
        };
      case 'BUILDING_SEARCH':
        return {
          status: 'Filtering building footprint catalog within 150m river buffer…',
        };
      case 'BUILDINGS_APPEAR':
        return {
          status: `${candidates.length} building footprints detected in the query result`,
          buttonLabel: 'Apply Temporal Filter (2020 → 2026) →',
          nextState: 'TEMPORAL_FILTER',
        };
      case 'TEMPORAL_FILTER':
        return {
          status: 'Evaluating multi-temporal spectral delta (Sentinel-2 MSI 2020 baseline vs 2026)…',
        };
      case 'CANDIDATES_APPEAR':
        return {
          status: `${candidates.length} candidate site${candidates.length === 1 ? '' : 's'} detected from the local dataset`,
          buttonLabel: selectedCandidate ? `Inspect ${selectedCandidate.name.split('—')[0].trim()} →` : undefined,
          nextState: selectedCandidate ? 'SELECT_SITE' : undefined,
        };
      case 'SELECT_SITE':
        return {
          status: selectedCandidate ? `Selected site locked: ${selectedCandidate.name}` : 'No site selected',
          buttonLabel: 'Activate Time Machine →',
          nextState: 'TIME_MACHINE',
        };
      case 'TIME_MACHINE':
        return {
          status: 'Scrub timeline below to inspect site across 2011, 2015, 2020, 2024, and 2026',
          buttonLabel: 'Compare 2020 vs 2024 →',
          nextState: 'BEFORE_AFTER',
        };
      case 'BEFORE_AFTER':
        return {
          status: changeEvent ? `Spatial comparison: ${changeEvent.beforeObservation.year} vs ${changeEvent.afterObservation.year}` : 'No matched change event available',
          buttonLabel: 'Isolate Change Event →',
          nextState: 'CHANGE_EVENT',
        };
      case 'CHANGE_EVENT':
        return {
          status: changeEvent ? `Change event: ${changeEvent.title ?? changeEvent.type} (${Math.round(changeEvent.confidence * 100)}% confidence)` : 'No matched change event available',
          buttonLabel: 'Why This Is a Change →',
          nextState: 'WHY_CHANGE',
        };
      case 'WHY_CHANGE':
        return {
          status: 'Explanation generated from the selected event and local temporal records',
          buttonLabel: 'Run False-Signal Verification Audit →',
          nextState: 'VERIFICATION',
        };
      case 'VERIFICATION':
        return {
          status: 'Cloud shadow, phenology, and registration drift dismissed',
          buttonLabel: 'Inspect Evidence Dossier →',
          nextState: 'EVIDENCE',
        };
      case 'EVIDENCE':
        return {
          status: evidence?.unavailableReason ?? 'Selected change evidence compiled',
          buttonLabel: 'Trace Data Lineage & STAC Provenance →',
          nextState: 'PROVENANCE',
        };
      case 'PROVENANCE':
        return {
          status: 'End-to-end provenance verified from finding down to raw Zarr raster slices',
          buttonLabel: 'Proceed to Analyst Review →',
          nextState: 'ANALYST_REVIEW',
        };
      default:
        return null;
    }
  };

  const currentAction = getAction();
  if (!currentAction || state === 'QUERY' || state === 'INTENT' || state === 'ANALYST_REVIEW' || state === 'REPORT') {
    return null;
  }

  // In temporal states (TIME_MACHINE), position slightly higher so it doesn't overlap the timeline scrubber
  const bottomPosition = state === 'TIME_MACHINE' ? 'bottom-28' : 'bottom-6';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className={`fixed ${bottomPosition} left-1/2 -translate-x-1/2 z-40 font-mono select-none`}
      >
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#00d4ff]/40 bg-[#0a0a0f]/90 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] text-xs">
          <div className="flex items-center gap-2 text-[#e8e8ec]">
            <span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-ping shrink-0" />
            <span className="text-[11px] text-[#cbd5e1] max-w-lg truncate">{currentAction.status}</span>
          </div>

          {currentAction.buttonLabel && (
            <button
              onClick={() => {
                if (currentAction.action) {
                  currentAction.action();
                } else if (currentAction.nextState) {
                  setState(currentAction.nextState);
                }
              }}
              className="ml-2 px-3.5 py-1.5 rounded-lg bg-[#00d4ff] text-[#0a0a0f] font-bold text-[11px] uppercase tracking-wider hover:bg-[#00d4ff]/90 transition-all shadow-[0_0_15px_rgba(0,212,255,0.4)] hover:shadow-[0_0_25px_rgba(0,212,255,0.7)] cursor-pointer whitespace-nowrap active:scale-95"
            >
              {currentAction.buttonLabel}
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
