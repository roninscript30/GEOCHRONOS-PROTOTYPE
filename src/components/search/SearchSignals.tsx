'use client';

import { useInvestigationStore } from '@/store/investigation';

export function SearchSignals() {
  const { state, searchSignals } = useInvestigationStore();

  if (state === 'QUERY' || searchSignals.length === 0) return null;

  return (
    <div className="absolute right-6 top-24 z-40 w-[320px] rounded-2xl border border-[#1e1e2e] bg-[#0a0a0f]/85 p-4 shadow-2xl backdrop-blur-xl">
      <div className="mb-3 text-[10px] uppercase tracking-[0.28em] text-[#00d4ff]">Search signals</div>
      <div className="space-y-3">
        {searchSignals.map((signal) => (
          <div key={signal.id} className="rounded-xl border border-[#1e1e2e] bg-[#111827]/60 p-2.5">
            <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#d1d5db]">
              <span>{signal.label}</span>
              <span className={signal.status === 'complete' ? 'text-[#22c55e]' : signal.status === 'active' ? 'text-[#f59e0b]' : 'text-[#6b6b80]'}>
                {signal.status}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#1f2937]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#00d4ff] via-[#3b82f6] to-[#22c55e] transition-all" style={{ width: `${signal.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
