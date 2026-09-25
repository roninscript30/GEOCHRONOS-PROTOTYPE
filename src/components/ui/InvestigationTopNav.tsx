'use client';

import { useInvestigationStore } from '@/store/investigation';
import { motion, AnimatePresence } from 'motion/react';
import type { InvestigationState } from '@/types/investigation';
import { INVESTIGATION_STATES } from '@/types/investigation';

export function InvestigationTopNav() {
  const { state, setState, queryText, resetInvestigation, queryIntent } = useInvestigationStore();

  if (state === 'QUERY') return null;

  const currentStateIndex = INVESTIGATION_STATES.indexOf(state);

  const getDynamicLabel = (id: InvestigationState) => {
    if (id === 'INTENT') return 'Intent';
    if (id === 'RIVER_MAP_GENERATED') {
      const spatial = queryIntent?.fragments?.find(f => f.type === 'SPATIAL')?.text;
      if (spatial && spatial.includes('RIVER')) return 'Rivers';
      return spatial ? 'Context Map' : 'Context Map';
    }
    if (id === 'BUILDINGS_APPEAR') {
      const feature = queryIntent?.fragments?.find(f => f.type === 'FEATURE')?.text;
      if (feature && feature.includes('FOOTPRINT')) return 'Buildings';
      return feature ? 'Features' : 'Target Features';
    }
    if (id === 'CANDIDATES_APPEAR') return 'Candidates';
    if (id === 'SELECT_SITE') return 'Selected Site';
    if (id === 'TIME_MACHINE') return 'Time Machine';
    if (id === 'BEFORE_AFTER') return 'Before/After';
    if (id === 'WHY_CHANGE') return 'Explanation';
    if (id === 'VERIFICATION') return 'Verification';
    if (id === 'EVIDENCE') return 'Evidence';
    if (id === 'PROVENANCE') return 'Provenance';
    if (id === 'ANALYST_REVIEW') return 'Review';
    if (id === 'REPORT') return 'Report';
    return id;
  };

  const steps: InvestigationState[] = [
    'INTENT',
    'RIVER_MAP_GENERATED',
    'BUILDINGS_APPEAR',
    'CANDIDATES_APPEAR',
    'SELECT_SITE',
    'TIME_MACHINE',
    'BEFORE_AFTER',
    'WHY_CHANGE',
    'VERIFICATION',
    'EVIDENCE',
    'PROVENANCE',
    'ANALYST_REVIEW',
    'REPORT',
  ];

  return (
    <AnimatePresence>
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed top-4 left-6 right-6 z-50 flex items-center justify-between font-mono select-none"
      >
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-[#00d4ff]/30 bg-[#0a0a0f]/90 backdrop-blur-xl shadow-xl text-xs max-w-md">
          <div className="flex items-center gap-1.5 text-[#00d4ff] font-bold text-[10px] tracking-wider px-2 py-0.5 rounded bg-[#00d4ff]/10 border border-[#00d4ff]/25 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
            GEOCHRONOS
          </div>
          <span className="text-[#e8e8ec] truncate text-[11px] font-medium">
            &ldquo;{queryText || 'Analyst Session'}&rdquo;
          </span>
        </div>

        <nav className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/85 backdrop-blur-xl shadow-xl text-[10px] overflow-x-auto max-w-[65vw] no-scrollbar">
          {steps.map((stepId) => {
            const stepIndex = INVESTIGATION_STATES.indexOf(stepId);
            const isActive = state === stepId;
            const isPassed = currentStateIndex > stepIndex;
            const label = getDynamicLabel(stepId);

            return (
              <button
                key={stepId}
                onClick={() => setState(stepId)}
                className={`px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/50 font-bold shadow-[0_0_10px_rgba(0,212,255,0.3)]'
                    : isPassed
                    ? 'text-[#22c55e] hover:bg-white/5 border border-transparent'
                    : 'text-[#6b6b80] hover:text-[#e8e8ec] hover:bg-white/5 border border-transparent'
                }`}
                title={`Jump to ${label}`}
              >
                {isPassed && <span className="text-[8px] text-[#22c55e]">✓</span>}
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-ping" />}
                <span>{label}</span>
              </button>
            );
          })}

          <div className="h-4 w-[1px] bg-[#1e1e2e] mx-1" />

          <button
            onClick={resetInvestigation}
            className="p-1.5 text-[#6b6b80] hover:text-[#ef4444] transition-colors cursor-pointer rounded-lg hover:bg-[#ef4444]/10"
            title="Start New Investigation"
          >
            ✕
          </button>
        </nav>
      </motion.header>
    </AnimatePresence>
  );
}
