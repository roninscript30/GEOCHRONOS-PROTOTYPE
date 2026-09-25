'use client';

import { useInvestigationStore } from '@/store/investigation';

export function AnalystActions() {
  const { state, setDecision, setState } = useInvestigationStore();

  if (state !== 'ANALYST_REVIEW') return null;

  return (
    <div className="absolute bottom-6 left-1/2 z-40 w-[420px] -translate-x-1/2 rounded-2xl border border-[#1e1e2e] bg-[#0a0a0f]/85 p-4 shadow-2xl backdrop-blur-xl">
      <div className="mb-3 text-[10px] uppercase tracking-[0.28em] text-[#00d4ff]">Analyst review</div>
      <div className="flex gap-3">
        <button
          onClick={() => {
            setDecision({ action: 'CONFIRM', timestamp: new Date().toISOString(), notes: 'Change is consistent with local evidence.' });
            setState('REPORT');
          }}
          className="flex-1 rounded-xl border border-[#22c55e]/40 bg-[#22c55e]/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#22c55e]"
        >
          Confirm
        </button>
        <button
          onClick={() => {
            setDecision({ action: 'REJECT', timestamp: new Date().toISOString(), notes: 'Evidence does not support the claim.' });
            setState('REPORT');
          }}
          className="flex-1 rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ef4444]"
        >
          Reject
        </button>
        <button
          onClick={() => {
            setDecision({ action: 'REFINE', timestamp: new Date().toISOString(), notes: 'Refine the detection to a narrower corridor window.' });
            setState('REPORT');
          }}
          className="flex-1 rounded-xl border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f59e0b]"
        >
          Refine
        </button>
      </div>
    </div>
  );
}
