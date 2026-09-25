'use client';

import { useEffect, useRef } from "react";
import { useInvestigationStore } from "@/store/investigation";
import { SEARCH_SIGNALS, VERIFICATION_CHECKS, PROVENANCE_NODES, INVESTIGATION_CENTER, INVESTIGATION_ZOOM, SITE_ZOOM } from "@/data/fixtures";

import {
  queryInvestigationDataset,
  getTemporalStatesForSite,
  getObservationsForSite,
  findChangeEventForCandidate,
  buildChangeExplanation,
  fetchEvidence,
  filterProvenanceForCandidate,
} from '@/lib/dataService';
import type { InvestigationState } from '@/types/investigation';
import { INVESTIGATION_STATES } from '@/types/investigation';

const STATE_DELAYS: Record<string, number> = {
  INTENT: 2200,
  RIVER_SEARCH: 2000,
  RIVER_MAP_GENERATED: 3000,
  BUILDING_SEARCH: 2000,
  BUILDINGS_APPEAR: 3000,
  TEMPORAL_FILTER: 2200,
  CANDIDATES_APPEAR: 3500,
  SELECT_SITE: 2800,
  TIME_MACHINE: 3800,
  BEFORE_AFTER: 3200,
  CHANGE_EVENT: 2800,
  WHY_CHANGE: 3500,
  VERIFICATION: 3400,
  EVIDENCE: 3200,
  PROVENANCE: 3200,
};

function getNextState(current: InvestigationState): InvestigationState | null {
  const idx = INVESTIGATION_STATES.indexOf(current);
  if (idx === -1 || idx >= INVESTIGATION_STATES.length - 1) return null;
  const next = INVESTIGATION_STATES[idx + 1];
  if (current === 'PROVENANCE' && next === 'ANALYST_REVIEW') {
    return 'ANALYST_REVIEW';
  }
  return next;
}

export function useInvestigationOrchestrator() {
  const {
    state,
    isAutoAdvancing,
    setState,
    setQueryIntent,
    addSearchSignal,
    updateSearchSignal,
    setCandidates,
    selectCandidate,
    setObservations,
    setCurrentYear,
    setChangeEvent,
    setChangeExplanation,
    addVerificationCheck,
    updateVerificationCheck,
    setEvidence,
    setProvenanceNodes,
    setMapViewState,
  } = useInvestigationStore();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const datasetRef = useRef<any>(null);

  useEffect(() => {
    switch (state) {
      case 'QUERY':
        // Camera animation is handled by MapCanvas flyTo on state change
        break;

      case 'INTENT':
        const { queryText } = useInvestigationStore.getState();
        queryInvestigationDataset(queryText).then((result) => {
          datasetRef.current = result.dataset;
          setQueryIntent(result.queryIntent);
          datasetRef.current.prefetchedCandidates = result.candidates;
          datasetRef.current.prefetchedSelected = result.selectedCandidate;
          datasetRef.current.prefetchedCenter = result.center;
          datasetRef.current.prefetchedZoom = result.zoom;
          setCandidates(result.candidates);
        });
        break;

      case 'RIVER_SEARCH':
        SEARCH_SIGNALS.forEach((sig) => addSearchSignal(sig));
        updateSearchSignal('spatial-1', { status: 'active', progress: 50 });
        break;

      case 'RIVER_MAP_GENERATED':
        updateSearchSignal('spatial-1', { status: 'complete', progress: 100 });
        break;

      case 'BUILDING_SEARCH':
        updateSearchSignal('feature-1', { status: 'active', progress: 50 });
        break;

      case 'BUILDINGS_APPEAR':
        updateSearchSignal('feature-1', { status: 'complete', progress: 100 });
        break;

      case 'TEMPORAL_FILTER':
        updateSearchSignal('temporal-1', { status: 'active', progress: 70 });
        break;

      case 'CANDIDATES_APPEAR':
        if (datasetRef.current?.prefetchedCandidates) {
          setCandidates(datasetRef.current.prefetchedCandidates);
        }
        updateSearchSignal('temporal-1', { status: 'complete', progress: 100 });
        updateSearchSignal('semantic-1', { status: 'complete', progress: 100 });
        break;

      case 'SELECT_SITE':
        const currentCandidates = useInvestigationStore.getState().candidates;
        const selected = datasetRef.current?.prefetchedSelected || undefined;
        if (selected) {
          if (!useInvestigationStore.getState().selectedCandidate) {
            selectCandidate(selected);
          }
          // Camera animation is handled by MapCanvas flyTo on state change
        }
        break;

      case 'TIME_MACHINE':
        const selCand = useInvestigationStore.getState().selectedCandidate;
        if (selCand && datasetRef.current) {
          const states = getTemporalStatesForSite(datasetRef.current.temporalStates, selCand.id, selCand.featureId);
          const obs = getObservationsForSite(datasetRef.current.observations, states);
          setObservations(obs);
          setCurrentYear(obs.length > 0 ? obs[0].year : 2020);
          setTimeout(() => setCurrentYear(obs.length > 1 ? obs[obs.length - 1].year : 2024), 1800);
        }
        break;

      case 'BEFORE_AFTER':
        setCurrentYear(2024);
        break;

      case 'CHANGE_EVENT':
        const candForEvent = useInvestigationStore.getState().selectedCandidate;
        if (candForEvent && datasetRef.current) {
          const event = findChangeEventForCandidate(datasetRef.current.changeEvents, candForEvent);
          if (event) {
            setChangeEvent(event);
            setCurrentYear(event.afterObservation.year);
          }
        }
        break;

      case 'WHY_CHANGE':
        const eventForExp = useInvestigationStore.getState().changeEvent;
        const candForExp = useInvestigationStore.getState().selectedCandidate;
        if (eventForExp && candForExp && datasetRef.current) {
          const tempStates = getTemporalStatesForSite(datasetRef.current.temporalStates, candForExp.id, candForExp.featureId);
          const exp = buildChangeExplanation(candForExp, eventForExp, tempStates);
          setChangeExplanation(exp);
        }
        break;

      case 'VERIFICATION':
        VERIFICATION_CHECKS.forEach((check) => addVerificationCheck(check));
        VERIFICATION_CHECKS.forEach((check, i) => {
          setTimeout(() => {
            updateVerificationCheck(check.id, { status: 'passing' });
          }, (i + 1) * 500);
        });
        break;

      case 'EVIDENCE':
        const evEvent = useInvestigationStore.getState().changeEvent;
        const evCand = useInvestigationStore.getState().selectedCandidate;
        if (evEvent && evCand) {
          fetchEvidence(evEvent, evCand).then(ev => {
            setEvidence(ev);
          });
        }
        break;

      case 'PROVENANCE':
        const provCand = useInvestigationStore.getState().selectedCandidate;
        if (provCand && datasetRef.current) {
           const filteredNodes = filterProvenanceForCandidate(datasetRef.current.provenance, provCand, useInvestigationStore.getState().changeEvent);
           setProvenanceNodes(filteredNodes);
        } else {
           setProvenanceNodes(PROVENANCE_NODES);
        }
        break;

      case 'ANALYST_REVIEW':
        break;

      default:
        break;
    }

    if (!isAutoAdvancing) return;
    const delay = STATE_DELAYS[state];
    if (delay === undefined) return;
    const next = getNextState(state);
    if (!next) return;

    timerRef.current = setTimeout(() => {
      setState(next);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    state,
    isAutoAdvancing,
    setState,
    setQueryIntent,
    addSearchSignal,
    updateSearchSignal,
    setCandidates,
    selectCandidate,
    setObservations,
    setCurrentYear,
    setChangeEvent,
    setChangeExplanation,
    addVerificationCheck,
    updateVerificationCheck,
    setEvidence,
    setProvenanceNodes,
    setMapViewState,
  ]);
}
