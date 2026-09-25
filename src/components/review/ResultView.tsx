import { useInvestigationStore } from '@/store/investigation';
import { motion, AnimatePresence } from 'framer-motion';

export const ResultView = () => {
  const { state, changeExplanation, evidence, setDecision } = useInvestigationStore();

  if (state !== 'ANALYST_REVIEW') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-50"
      >
        <div className="w-full max-w-2xl bg-[#121218]/95 border border-white/10 rounded-xl p-8 shadow-2xl pointer-events-auto">
          <div className="text-center mb-8">
            <h2 className="font-mono text-xl tracking-widest text-white mb-2">INVESTIGATION CONCLUDED</h2>
            <p className="font-mono text-sm text-amber-500">{changeExplanation?.what || 'VERIFIED CHANGE DETECTED'}</p>
          </div>

          <div className="bg-white/5 rounded-lg p-6 border border-white/5 mb-8">
            <h3 className="font-mono text-xs text-slate-500 tracking-widest mb-4">SYNTHESIS</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              {changeExplanation?.narrative}
            </p>
            <div className="space-y-2">
               <div className="flex space-x-2 text-xs text-slate-400 font-mono">
                 <span className="text-blue-500">✓</span>
                 <span>PREVIOUS: {changeExplanation?.previousState}</span>
               </div>
               <div className="flex space-x-2 text-xs text-slate-400 font-mono">
                 <span className="text-amber-500">✓</span>
                 <span>CURRENT: {changeExplanation?.currentState}</span>
               </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button 
              onClick={() => setDecision({ action: 'CONFIRM', timestamp: new Date().toISOString(), notes: 'Verified via synthetic raster preview' })}
              className="px-6 py-3 bg-white hover:bg-slate-200 text-black rounded font-mono text-sm tracking-widest transition-colors"
            >
              APPROVE FINDING
            </button>
            <button 
              onClick={() => setDecision({ action: 'REJECT', timestamp: new Date().toISOString(), notes: 'Insufficient raster quality' })}
              className="px-6 py-3 bg-transparent hover:bg-white/5 border border-white/20 text-white rounded font-mono text-sm tracking-widest transition-colors"
            >
              REJECT
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
