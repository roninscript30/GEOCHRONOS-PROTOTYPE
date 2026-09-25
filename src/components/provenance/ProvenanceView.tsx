import { useInvestigationStore } from '@/store/investigation';
import { motion, AnimatePresence } from 'framer-motion';

export const ProvenanceView = () => {
  const { state, provenanceNodes } = useInvestigationStore();

  if (state !== 'PROVENANCE') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute top-24 left-8 bottom-24 w-96 bg-[#121218]/90 border border-white/10 rounded-xl p-6 backdrop-blur-md shadow-2xl z-40 pointer-events-auto flex flex-col"
      >
        <div className="flex items-center space-x-3 mb-6 border-b border-white/10 pb-4">
          <h3 className="font-mono text-sm tracking-widest text-slate-300">DATA PROVENANCE LINEAGE</h3>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {provenanceNodes.map((node, i) => (
            <div key={node.id} className="relative">
              {i !== provenanceNodes.length - 1 && (
                <div className="absolute top-10 bottom-[-16px] left-4 w-px bg-white/20" />
              )}
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <div className="flex-1 bg-white/5 rounded-lg p-4 border border-white/5">
                  <div className="font-mono text-[10px] text-blue-400 mb-1">{node.type}</div>
                  <div className="font-mono text-xs text-white mb-2">{node.description}</div>
                  <div className="font-mono text-[9px] text-slate-500 break-all">{node.uri}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
