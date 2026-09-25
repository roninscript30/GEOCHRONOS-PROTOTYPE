'use client';

import { useInvestigationStore } from '@/store/investigation';

export function ProvenanceTrace() {
  const { state, provenanceNodes } = useInvestigationStore();

  if (state === 'QUERY' || provenanceNodes.length === 0) return null;

  return (
    <div className="absolute left-6 bottom-6 z-40 w-[360px] rounded-2xl border border-[#1e1e2e] bg-[#0a0a0f]/85 p-4 shadow-2xl backdrop-blur-xl">
      <div className="mb-3 text-[10px] uppercase tracking-[0.28em] text-[#00d4ff]">Provenance trace</div>
      <div className="space-y-2 text-xs text-[#d1d5db]">
        {provenanceNodes.slice(0, 5).map((node) => (
          <div key={node.id} className="rounded-xl border border-[#1e1e2e] bg-[#111827]/60 p-2.5">
            <div className="font-semibold text-white">{node.label}</div>
            <div className="mt-1 text-[11px] text-[#6b6b80]">{node.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
