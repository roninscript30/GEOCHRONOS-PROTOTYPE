import { useInvestigationStore } from '@/store/investigation';
import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

export const SiteComparison = () => {
  const { state, changeEvent } = useInvestigationStore();
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  if (state !== 'BEFORE_AFTER' && state !== 'CHANGE_EVENT' && state !== 'WHY_CHANGE' && state !== 'EVIDENCE') return null;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const beforeYear = 2020;
  const afterYear = 2026;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute top-24 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#121218]/90 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl pointer-events-auto"
    >
      <div className="absolute top-0 left-0 w-full h-12 bg-black/50 border-b border-white/10 flex items-center justify-between px-4 z-20">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="font-mono text-xs text-slate-300">EPOCH {beforeYear} : PRE-CONSTRUCTION</span>
        </div>
        <div className="font-mono text-[10px] text-slate-500">SENSOR: SENTINEL-2B / RASTER UNAVAILABLE - SYNTHETIC PREVIEW</div>
        <div className="flex items-center space-x-2">
          <span className="font-mono text-xs text-amber-500">EPOCH {afterYear} : BUILT STATE</span>
          <span className="w-2 h-2 rounded-full bg-amber-500" />
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full h-full cursor-ew-resize mt-12"
        onMouseMove={handleMouseMove}
      >

        {/* AFTER STATE (Background) */}
        <div className="absolute inset-0 bg-[#0a0a0f] overflow-hidden">
           <img src="/fixtures/chennai_adyar_2024_post.jpg" alt="After" className="w-full h-full object-cover opacity-80" />
           {/* Built structure highlight */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 bg-amber-500/20 border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] flex items-center justify-center pointer-events-none">
             <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-30" />
           </div>
        </div>

        {/* BEFORE STATE (Clipped foreground) */}
        <div 
          className="absolute inset-0 bg-[#0a0a0f] overflow-hidden border-r-2 border-[#00d4ff]"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
           <img src="/fixtures/chennai_adyar_2020_pre.jpg" alt="Before" className="w-full h-full object-cover opacity-80 filter grayscale" />
           {/* Vacant land */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border border-dashed border-[#00d4ff]/50 flex items-center justify-center pointer-events-none">
           </div>
        </div>

        {/* Slider Handle */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] z-30"
          style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-lg">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
