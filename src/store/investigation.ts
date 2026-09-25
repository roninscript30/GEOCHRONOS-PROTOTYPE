'use client';

import { create } from 'zustand';
import type {
  InvestigationState,
  QueryIntent,
  SearchSignal,
  GeoCandidate,
  TemporalObservation,
  ChangeEvent,
  ChangeExplanation,
  VerificationCheck,
  EvidenceItem,
  ProvenanceNode,
  AnalystDecision,
  MapViewState,
} from '@/types/investigation';
import { INVESTIGATION_STATES } from '@/types/investigation';

interface InvestigationStore {
  // Current investigation state (15 stages)
  state: InvestigationState;
  previousState: InvestigationState | null;

  // Query
  queryText: string;
  queryIntent: QueryIntent | null;

  // Search Signals
  searchSignals: SearchSignal[];

  // Discovery & Candidates
  candidates: GeoCandidate[];
  selectedCandidate: GeoCandidate | null;

  // Temporal
  observations: TemporalObservation[];
  currentYear: number;
  timelineRange: [number, number];

  // Change Detection & Explanation
  changeEvent: ChangeEvent | null;
  changeExplanation: ChangeExplanation | null;

  // Verification
  verificationChecks: VerificationCheck[];

  // Evidence
  evidence: EvidenceItem | null;

  // Provenance
  provenanceNodes: ProvenanceNode[];

  // Analyst Decision
  decision: AnalystDecision | null;

  // Map
  mapViewState: MapViewState;
  visibleLayers: string[];

  // Flow playback & controller
  isAutoAdvancing: boolean;

  // Actions
  setState: (state: InvestigationState) => void;
  nextState: () => void;
  previousStateAction: () => void;
  submitQuery: (text: string) => void;
  setQueryIntent: (intent: QueryIntent) => void;
  addSearchSignal: (signal: SearchSignal) => void;
  updateSearchSignal: (id: string, update: Partial<SearchSignal>) => void;
  setCandidates: (candidates: GeoCandidate[]) => void;
  selectCandidate: (candidate: GeoCandidate) => void;
  setObservations: (observations: TemporalObservation[]) => void;
  setCurrentYear: (year: number) => void;
  setChangeEvent: (event: ChangeEvent) => void;
  setChangeExplanation: (explanation: ChangeExplanation) => void;
  addVerificationCheck: (check: VerificationCheck) => void;
  updateVerificationCheck: (id: string, update: Partial<VerificationCheck>) => void;
  setEvidence: (evidence: EvidenceItem) => void;
  setProvenanceNodes: (nodes: ProvenanceNode[]) => void;
  setDecision: (decision: AnalystDecision) => void;
  setMapViewState: (viewState: Partial<MapViewState>) => void;
  toggleLayer: (layerId: string) => void;
  startInvestigation: () => void;
  toggleAutoAdvancing: () => void;
  resetInvestigation: () => void;
}

const initialMapViewState: MapViewState = {
  longitude: 80.2385,
  latitude: 13.0195,
  zoom: 6.5,
  pitch: 30,
  bearing: 0,
};

export const useInvestigationStore = create<InvestigationStore>((set, get) => ({
  state: 'QUERY',
  previousState: null,
  queryText: '',
  queryIntent: null,
  searchSignals: [],
  candidates: [],
  selectedCandidate: null,
  observations: [],
  currentYear: 2026,
  timelineRange: [2011, 2026],
  changeEvent: null,
  changeExplanation: null,
  verificationChecks: [],
  evidence: null,
  provenanceNodes: [],
  decision: null,
  mapViewState: initialMapViewState,
  visibleLayers: ['base', 'satellite'],
  isAutoAdvancing: true,

  setState: (newState) =>
    set((s) => ({
      state: newState,
      previousState: s.state,
    })),

  nextState: () => {
    const { state } = get();
    const idx = INVESTIGATION_STATES.indexOf(state);
    if (idx !== -1 && idx < INVESTIGATION_STATES.length - 1) {
      set({
        state: INVESTIGATION_STATES[idx + 1],
        previousState: state,
      });
    }
  },

  previousStateAction: () => {
    const { state } = get();
    const idx = INVESTIGATION_STATES.indexOf(state);
    if (idx > 0) {
      set({
        state: INVESTIGATION_STATES[idx - 1],
        previousState: state,
      });
    }
  },

  submitQuery: (text) =>
    set({
      queryText: text,
      state: 'INTENT',
      previousState: 'QUERY',
      isAutoAdvancing: true,
    }),

  setQueryIntent: (intent) => set({ queryIntent: intent }),

  addSearchSignal: (signal) =>
    set((s) => ({
      searchSignals: [...s.searchSignals.filter((x) => x.id !== signal.id), signal],
    })),

  updateSearchSignal: (id, update) =>
    set((s) => ({
      searchSignals: s.searchSignals.map((sig) =>
        sig.id === id ? { ...sig, ...update } : sig
      ),
    })),

  setCandidates: (candidates) => set({ candidates }),

  selectCandidate: (candidate) =>
    set({
      selectedCandidate: candidate,
      state: 'SELECT_SITE',
      mapViewState: {
        longitude: candidate.coordinates[0],
        latitude: candidate.coordinates[1],
        zoom: 16.8,
        pitch: 62,
        bearing: 35,
      },
    }),

  setObservations: (observations) => set({ observations }),

  setCurrentYear: (year) => set({ currentYear: year }),

  setChangeEvent: (event) => set({ changeEvent: event }),

  setChangeExplanation: (explanation) => set({ changeExplanation: explanation }),

  addVerificationCheck: (check) =>
    set((s) => ({
      verificationChecks: [
        ...s.verificationChecks.filter((c) => c.id !== check.id),
        check,
      ],
    })),

  updateVerificationCheck: (id, update) =>
    set((s) => ({
      verificationChecks: s.verificationChecks.map((c) =>
        c.id === id ? { ...c, ...update } : c
      ),
    })),

  setEvidence: (evidence) => set({ evidence }),

  setProvenanceNodes: (nodes) => set({ provenanceNodes: nodes }),

  setDecision: (decision) => set({ decision }),

  setMapViewState: (viewState) =>
    set((s) => ({
      mapViewState: { ...s.mapViewState, ...viewState },
    })),

  toggleLayer: (layerId) =>
    set((s) => ({
      visibleLayers: s.visibleLayers.includes(layerId)
        ? s.visibleLayers.filter((l) => l !== layerId)
        : [...s.visibleLayers, layerId],
    })),

  startInvestigation: () => set({ isAutoAdvancing: true }),

  toggleAutoAdvancing: () => set((s) => ({ isAutoAdvancing: !s.isAutoAdvancing })),

  resetInvestigation: () =>
    set({
      state: 'QUERY',
      previousState: null,
      queryText: '',
      queryIntent: null,
      searchSignals: [],
      candidates: [],
      selectedCandidate: null,
      observations: [],
      currentYear: 2026,
      changeEvent: null,
      changeExplanation: null,
      verificationChecks: [],
      evidence: null,
      provenanceNodes: [],
      decision: null,
      mapViewState: initialMapViewState,
      visibleLayers: ['base', 'satellite'],
      isAutoAdvancing: false,
    }),
}));
