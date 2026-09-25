'use client';

import { useInvestigationStore } from '@/store/investigation';

export function QueryDecomposition() {
  const { state, queryIntent } = useInvestigationStore();

  if (state === 'QUERY' || !queryIntent) return null;

  const fragments = queryIntent.fragments ?? [];

  return (
    <div className="absolute left-6 top-[330px] z-40 w-[420px] rounded-2xl border border-[#1e1e2e] bg-[#0a0a0f]/85 p-4 shadow-2xl backdrop-blur-xl">
      <div className="mb-3 text-[10px] uppercase tracking-[0.28em] text-[#00d4ff]">Query decomposition</div>
      <div className="space-y-3 text-xs text-[#e8e8ec]">
        {fragments.map((fragment) => (
          <div key={fragment.text} className="flex items-center justify-between rounded-lg border border-[#1e1e2e] bg-[#111827]/60 px-3 py-2">
            <div className="flex items-center gap-3">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fragment.color }} />
              <span className="font-medium uppercase tracking-wide text-[#f8fafc]">{fragment.type}</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-white">{fragment.text}</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-[#6b6b80]">{fragment.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
