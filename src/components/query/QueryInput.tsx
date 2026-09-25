'use client';

import { useInvestigationStore } from '@/store/investigation';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_QUERIES = [
  'Find newly constructed buildings near rivers in the local Tamil Nadu evidence set',
  'Identify river-adjacent structures that appeared after 2020',
  'Locate floodplain encroachments near the Adyar corridor',
  'Search for construction growth along water channels',
];

export function QueryInput() {
  const { state, queryText, submitQuery } = useInvestigationStore();

  if (state !== 'QUERY') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute left-6 top-24 z-40 w-[420px] rounded-2xl border border-[#1e1e2e] bg-[#0a0a0f]/85 p-4 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-[#00d4ff]">Natural language query</div>
            <h2 className="mt-1 text-lg font-semibold text-[#f8fafc]">GeoChronos Analyst</h2>
          </div>
          <span className="rounded-full border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-[#00d4ff]">
            Local Data
          </span>
        </div>

        <textarea
          value={queryText}
          onChange={(e) => useInvestigationStore.setState((s) => ({ ...s, queryText: e.target.value }))}
          placeholder="Describe the change pattern you want to investigate..."
          className="w-full min-h-[92px] resize-none rounded-xl border border-[#1e1e2e] bg-[#111827]/60 p-3 font-mono text-xs text-[#e8e8ec] outline-none placeholder:text-[#6b6b80] focus:border-[#00d4ff]/70"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              submitQuery(queryText || PRESET_QUERIES[0]);
            }
          }}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {PRESET_QUERIES.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => submitQuery(preset)}
              className="rounded-full border border-[#1e1e2e] bg-[#111827]/70 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-[#d1d5db] transition hover:border-[#00d4ff]/60 hover:text-[#00d4ff]"
            >
              {preset.split(' ').slice(0, 4).join(' ')}
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => submitQuery(queryText || PRESET_QUERIES[0])}
            className="rounded-xl bg-[#00d4ff] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0a0a0f] shadow-[0_0_18px_rgba(0,212,255,0.35)] transition hover:bg-[#3ddcff]"
          >
            Run Investigation
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
