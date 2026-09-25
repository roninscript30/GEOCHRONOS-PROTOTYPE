'use client'

import { useInvestigationStore } from '@/store/investigation'
import { motion } from 'motion/react'

export function ReportView() {
  const {
    state,
    queryText,
    selectedCandidate,
    timelineRange,
    decision,
    changeEvent,
    evidence,
    verificationChecks,
    resetInvestigation,
  } = useInvestigationStore()

  if (state !== 'REPORT') return null

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { staggerChildren: 0.08 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }

  const action = decision?.action || 'CONFIRM'

  return (
    <div className="absolute inset-0 flex items-center justify-center z-[100] bg-[#0a0a0f]/80 backdrop-blur-md">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-[65%] max-w-4xl h-[82%] bg-[#12121a] border border-[#00d4ff]/40 shadow-2xl flex flex-col font-mono text-sm overflow-hidden rounded-xl"
      >
        <div className="p-6 border-b border-[#00d4ff]/20 flex justify-between items-center bg-[#0a0a0f]/70">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00d4ff] shadow-[0_0_8px_#00d4ff]" />
            <h2 className="text-[#00d4ff] uppercase tracking-widest text-base font-bold">Investigation Intelligence Dossier</h2>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10 uppercase text-xs tracking-wider rounded font-mono transition-colors">
              Export STAC / GeoJSON
            </button>
            <button 
              onClick={resetInvestigation} 
              className="px-4 py-2 bg-[#00d4ff] text-[#0a0a0f] hover:bg-[#00d4ff]/90 uppercase text-xs tracking-wider font-bold rounded font-mono transition-colors"
            >
              New Investigation
            </button>
          </div>
        </div>
        
        <div className="p-8 overflow-y-auto flex-1 space-y-6 text-[#e8e8ec]">
          {/* Query Section */}
          <motion.section variants={itemVariants} className="bg-[#0a0a0f]/60 p-4 rounded-lg border border-[#1e1e2e]">
            <h3 className="text-xs uppercase text-[#00d4ff]/70 mb-1 tracking-widest">Analyst Natural Language Query</h3>
            <p className="text-base text-white font-medium">&ldquo;{queryText || 'Find newly constructed buildings near rivers'}&rdquo;</p>
          </motion.section>

          {/* Grid of Context & Target */}
          <div className="grid grid-cols-2 gap-6">
            <motion.section variants={itemVariants} className="bg-[#0a0a0f]/40 p-4 rounded-lg border border-[#1e1e2e]">
              <h3 className="text-xs uppercase text-[#00d4ff]/70 mb-2 tracking-widest">Target Site Coordinates</h3>
              {selectedCandidate ? (
                <div className="text-xs space-y-1 text-[#e8e8ec]">
                  <div className="text-sm font-bold text-white">{selectedCandidate.name}</div>
                  <div>ID: <span className="text-[#00d4ff]">{selectedCandidate.featureId}</span></div>
                  <div>LAT: {selectedCandidate.coordinates[1].toFixed(5)}° N</div>
                  <div>LON: {selectedCandidate.coordinates[0].toFixed(5)}° E</div>
                  <div>CONFIDENCE SCORE: <span className="text-[#22c55e]">{(selectedCandidate.score * 100).toFixed(0)}%</span></div>
                </div>
              ) : (
                <p className="text-xs text-[#6b6b80]">No target candidate selected.</p>
              )}
            </motion.section>
            
            <motion.section variants={itemVariants} className="bg-[#0a0a0f]/40 p-4 rounded-lg border border-[#1e1e2e]">
              <h3 className="text-xs uppercase text-[#00d4ff]/70 mb-2 tracking-widest">Temporal Range & Interval</h3>
              <div className="text-xs space-y-1">
                <div>SURVEILLANCE WINDOW: <span className="text-white">{timelineRange[0]} — {timelineRange[1]}</span></div>
                <div>DETECTION INTERVAL: <span className="text-[#f59e0b]">{evidence?.changeInterval || '2020 to 2024 (4 yr 2 mo)'}</span></div>
                <div>OBSERVATION SENSOR: <span className="text-white">{evidence?.sensor || 'Sentinel-2 MSI Level-2A'}</span></div>
                <div>STATUS: <span className="text-[#22c55e]">Co-registered Orthorectified</span></div>
              </div>
            </motion.section>
          </div>

          {/* Change Event Characterization */}
          {changeEvent && (
            <motion.section variants={itemVariants} className="bg-[#0a0a0f]/40 p-4 rounded-lg border border-[#1e1e2e]">
              <h3 className="text-xs uppercase text-[#00d4ff]/70 mb-2 tracking-widest">Change Characterization</h3>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[#6b6b80] block">TYPE</span>
                  <span className="text-[#f59e0b] font-bold uppercase text-sm">{changeEvent.type}</span>
                </div>
                <div>
                  <span className="text-[#6b6b80] block">SURFACE EXTENT</span>
                  <span className="text-white font-bold">{changeEvent.extent.area} {changeEvent.extent.unit}</span>
                </div>
                <div>
                  <span className="text-[#6b6b80] block">DETECTION CONFIDENCE</span>
                  <span className="text-[#22c55e] font-bold">{(changeEvent.confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            </motion.section>
          )}

          {/* Verification Synthesis */}
          <motion.section variants={itemVariants} className="bg-[#0a0a0f]/40 p-4 rounded-lg border border-[#1e1e2e]">
            <h3 className="text-xs uppercase text-[#00d4ff]/70 mb-3 tracking-widest">Automated Verification Checks</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {verificationChecks.map((v) => (
                <div key={v.id} className="flex items-center gap-2 bg-[#12121a] p-2 rounded border border-[#1e1e2e]">
                  <span className={`w-2 h-2 rounded-full ${v.status === 'passing' ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'}`} />
                  <span className="font-semibold text-white">{v.name}:</span>
                  <span className="text-[#6b6b80] truncate">{v.detail}</span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Analyst Decision */}
          <motion.section variants={itemVariants} className="bg-[#0a0a0f]/60 p-4 rounded-lg border border-[#1e1e2e] flex items-center justify-between">
            <div>
              <h3 className="text-xs uppercase text-[#00d4ff]/70 mb-1 tracking-widest">Analyst Final Determination</h3>
              <div className="text-xs text-[#6b6b80]">
                TIMESTAMP: {decision?.timestamp ? new Date(decision.timestamp).toUTCString() : new Date().toUTCString()}
              </div>
            </div>
            <div className={`px-4 py-2 border rounded text-sm font-bold uppercase tracking-wider ${
              action === 'CONFIRM' ? 'border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10' :
              action === 'REJECT' ? 'border-[#ef4444] text-[#ef4444] bg-[#ef4444]/10' :
              'border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10'
            }`}>
              {action}ED
            </div>
          </motion.section>
        </div>
      </motion.div>
    </div>
  )
}
