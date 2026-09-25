import { useInvestigationStore } from '@/store/investigation';
import { motion, AnimatePresence } from 'framer-motion';

export const ChangeVisualization = () => {
  const { state, changeExplanation } = useInvestigationStore();

  if (state !== 'CHANGE_EVENT' && state !== 'WHY_CHANGE') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="absolute top-24 right-8 w-96 bg-[#121218]/90 border border-white/10 rounded-xl p-6 backdrop-blur-md shadow-2xl z-40 pointer-events-auto"
      >
        <div className="flex items-center space-x-3 mb-6 border-b border-white/10 pb-4">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <h3 className="font-mono text-sm tracking-widest text-amber-500">DETECTED CHANGE</h3>
        </div>

        {changeExplanation ? (
          <div className="space-y-6">
            <div>
              <div className="font-mono text-[10px] text-slate-500 mb-1">EVENT TYPE</div>
              <div className="font-mono text-sm text-white uppercase">{changeExplanation.what}</div>
            </div>
            
            <div>
              <div className="font-mono text-[10px] text-slate-500 mb-1">MAGNITUDE / EXTENT</div>
              <div className="font-mono text-sm text-white uppercase">{changeExplanation.extent}</div>
            </div>

            <div>
              <div className="font-mono text-[10px] text-slate-500 mb-1">LOCATION</div>
              <div className="font-mono text-sm text-white uppercase">{changeExplanation.where}</div>
            </div>

            <div>
              <div className="font-mono text-[10px] text-slate-500 mb-1">NARRATIVE</div>
              <div className="text-sm text-slate-300 leading-relaxed">
                {changeExplanation.narrative}
              </div>
            </div>
          </div>
        ) : (
          <div className="font-mono text-xs text-slate-500 animate-pulse">
            EXTRACTING GEOMETRIC DELTAS...
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
