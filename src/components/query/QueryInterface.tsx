import { useInvestigationStore } from '@/store/investigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export const QueryInterface = () => {
  const { state, submitQuery } = useInvestigationStore();
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      submitQuery(input);
    }
  };

  const suggestions = [
    "Find newly constructed buildings near rivers in Chennai",
    "Find buildings that disappeared between 2020 and 2026",
    "Find new road development near built-up areas",
    "Show sites with major construction growth"
  ];

  if (state !== 'QUERY') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-50"
      >
        <div className="w-full max-w-3xl pointer-events-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-light tracking-widest text-white mb-2">GEOCHRONOS</h1>
            <p className="font-mono text-sm text-slate-400">GEOSPATIAL INTELLIGENCE INSTRUMENT</p>
          </div>
          
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter analysis objective..."
              className="w-full bg-[#121218]/80 border border-white/20 rounded-lg px-6 py-5 text-xl text-white placeholder-white/30 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/50 shadow-2xl transition-all font-mono"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded font-mono text-sm tracking-widest text-white transition-colors"
            >
              EXECUTE
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center">
             <div className="font-mono text-xs text-slate-500 mb-4 tracking-widest">EXAMPLE QUERIES</div>
             <div className="flex flex-wrap justify-center gap-3">
               {suggestions.map((s) => (
                 <button
                   key={s}
                   onClick={() => setInput(s)}
                   className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-mono text-[10px] text-slate-300 transition-colors"
                 >
                   {s}
                 </button>
               ))}
             </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
