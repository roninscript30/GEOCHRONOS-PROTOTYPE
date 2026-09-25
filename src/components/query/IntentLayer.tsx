import { useInvestigationStore } from '@/store/investigation';
import { motion, AnimatePresence } from 'framer-motion';

export const IntentLayer = () => {
  const { state, queryIntent } = useInvestigationStore();

  if (state !== 'INTENT' && state !== 'RIVER_SEARCH' && state !== 'BUILDING_SEARCH') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/40 backdrop-blur-md z-40"
      >
        <div className="w-full max-w-2xl bg-[#121218]/90 border border-white/10 rounded-xl p-8 shadow-2xl">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-8 h-8 border-2 border-t-blue-500 border-r-blue-500 border-b-transparent border-l-transparent rounded-full animate-spin" />
            <h2 className="font-mono text-lg tracking-widest text-white">DECOMPOSING INTENT</h2>
          </div>
          
          {queryIntent && (
            <div className="space-y-6">
              <div className="flex flex-col">
                <span className="font-mono text-xs text-slate-500 mb-1">TEMPORAL CONSTRAINT</span>
                <span className="font-mono text-sm text-blue-400">
                  {queryIntent?.temporalRange?.start} → {queryIntent?.temporalRange?.end}
                </span>
              </div>
              
              <div className="flex flex-col">
                <span className="font-mono text-xs text-slate-500 mb-1">SPATIAL SCOPE</span>
                <span className="font-mono text-sm text-amber-400">
                  {queryIntent?.spatialConstraint?.properties?.name ?? 'Unknown Region'}
                </span>
              </div>
              
              <div className="flex flex-col">
                <span className="font-mono text-xs text-slate-500 mb-1">TARGET FEATURES</span>
                <div className="flex gap-2">
                  {queryIntent?.targetFeatures?.map((t) => (
                    <span key={t} className="px-2 py-1 bg-white/10 rounded font-mono text-xs text-white uppercase">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col">
                <span className="font-mono text-xs text-slate-500 mb-1">RELATIONSHIP / CONDITION</span>
                <span className="font-mono text-sm text-emerald-400 uppercase">
                  {queryIntent.relationship}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
