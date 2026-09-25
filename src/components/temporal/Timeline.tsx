'use client'

import { motion } from 'motion/react'
import { useInvestigationStore } from '@/store/investigation'

export function Timeline() {
  const { state, currentYear, setCurrentYear, observations } = useInvestigationStore()
  
  const isVisible = ['TIME_MACHINE', 'BEFORE_AFTER', 'CHANGE_EVENT', 'WHY_CHANGE'].includes(state)
  if (!isVisible) return null

  const epochs = [...observations].sort((left, right) => (left.year ?? 0) - (right.year ?? 0))

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[65%] max-w-4xl bg-[#0a0a0f]/90 backdrop-blur-xl border border-[#00d4ff]/30 rounded-2xl px-6 py-4 flex flex-col z-50 shadow-[0_10px_40px_rgba(0,0,0,0.8)] font-mono text-xs"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
          <span className="text-[#00d4ff] uppercase tracking-widest text-[10px] font-bold">
            Selected Site Multi-Temporal Observation Scrubber
          </span>
        </div>
        <span className="text-[#e8e8ec]/50 text-[10px]">
          ACTIVE YEAR: <span className="text-[#00d4ff] font-bold text-xs">{currentYear}</span>
        </span>
      </div>

      <div className="relative flex items-center justify-between my-2 px-4">
        {/* Track Line */}
        <div className="absolute top-1/2 left-6 right-6 h-[2px] bg-[#1e1e2e] -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 left-6 h-[2px] bg-gradient-to-r from-[#00d4ff] to-[#22c55e] -translate-y-1/2 z-0 transition-all duration-300"
          style={{
            width: `${epochs.length > 1 ? Math.max(0, (epochs.findIndex((epoch) => epoch.year === currentYear) / (epochs.length - 1)) * 100) : 0}%`
          }}
        />
        
        {epochs.map((ep) => {
          const isActive = ep.year === currentYear
          const hasFeature = ep.hasFeature
          
          return (
            <div 
              key={ep.year}
              onClick={() => setCurrentYear(ep.year)}
              className="relative z-10 flex flex-col items-center cursor-pointer group"
            >
              <div 
                className={`w-5 h-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                  isActive 
                    ? 'border-[#00d4ff] bg-[#00d4ff] shadow-[0_0_15px_#00d4ff] scale-125' 
                    : hasFeature 
                      ? 'border-[#f59e0b] bg-[#f59e0b]/20 group-hover:border-[#f59e0b]' 
                      : 'border-[#1e1e2e] bg-[#12121a] group-hover:border-[#e8e8ec]/60'
                }`}
              >
                {hasFeature && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#0a0a0f]' : 'bg-[#f59e0b]'}`} />
                )}
              </div>
              <span className={`mt-2 text-[10px] tracking-wider transition-colors ${
                isActive ? 'text-[#00d4ff] font-bold' : 'text-[#e8e8ec]/60 group-hover:text-white'
              }`}>
                {ep.year}
              </span>
              <span className="text-[8px] text-[#6b6b80] hidden sm:block max-w-[80px] text-center truncate">
                {(ep.notes || '').replaceAll('_', ' ')}
              </span>
            </div>
          )
        })}
      </div>
      {epochs.length === 0 && (
        <div className="border-t border-[#1e1e2e] pt-3 text-[10px] uppercase tracking-wider text-[#f59e0b]">
          No temporal states are available for the selected site in the local dataset.
        </div>
      )}
    </motion.div>
  )
}
