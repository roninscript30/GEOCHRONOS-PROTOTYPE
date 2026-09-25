'use client';

import { useInvestigationStore } from '@/store/investigation';
import { motion, AnimatePresence } from 'framer-motion';

export const EvidenceView = () => {
  const { state, evidence } = useInvestigationStore();

  if (state !== 'EVIDENCE') return null;

  const lat = evidence?.location?.latitude ?? 13.0195;
  const lon = evidence?.location?.longitude ?? 80.2385;
  const beforeDate = evidence?.epochBefore?.date ?? evidence?.acquisitionBefore ?? '2020-03-15';
  const afterDate = evidence?.epochAfter?.date ?? evidence?.acquisitionAfter ?? '2024-05-15';
  const beforeSensor = evidence?.epochBefore?.sensor ?? 'Sentinel-2B (MSI)';
  const afterSensor = evidence?.epochAfter?.sensor ?? 'Sentinel-2A (MSI)';
  const beforeCloud = evidence?.epochBefore?.cloudCover ?? '0.2%';
  const afterCloud = evidence?.epochAfter?.cloudCover ?? '0.0%';
  const sunElev = evidence?.epochAfter?.sunElevation ?? '62.1°';
  const beforeImg = evidence?.beforeImageUrl || evidence?.epochBefore?.imageUrl || '/fixtures/chennai_adyar_2020_pre.jpg';
  const afterImg = evidence?.afterImageUrl || evidence?.epochAfter?.imageUrl || '/fixtures/chennai_adyar_2024_post.jpg';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute inset-x-24 top-24 bottom-24 bg-[#121218]/95 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl z-40 pointer-events-auto flex flex-col font-mono"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
          <div className="flex items-center space-x-4">
            <h3 className="font-mono text-xl tracking-widest text-white">EVIDENCE DOSSIER</h3>
            <span className="px-2 py-1 bg-amber-500/20 text-amber-500 font-mono text-[10px] rounded">VERIFIED</span>
          </div>
          <div className="font-mono text-xs text-slate-500">ID: {evidence?.id || 'EV-001'}</div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-8 overflow-hidden">
          {/* Imagery Panel */}
          <div className="flex flex-col space-y-4">
            <h4 className="font-mono text-xs text-slate-500 tracking-widest">SPECTRAL / RASTER SOURCE</h4>
            <div className="flex-1 rounded-xl bg-[#0a0a0f] border border-white/5 relative overflow-hidden flex flex-col">
              <div className="h-1/2 border-b border-white/10 relative overflow-hidden group">
                <img
                  src={beforeImg}
                  alt="Epoch 1 Pre-Change Satellite Raster"
                  className="w-full h-full object-cover opacity-85 filter contrast-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-4 bg-black/70 px-2 py-1 rounded font-mono text-[10px] text-blue-400 border border-blue-400/30">
                  EPOCH 1: {beforeDate}
                </div>
                <div className="absolute top-3 right-4 bg-black/70 px-2 py-1 rounded font-mono text-[10px] text-slate-300 border border-white/10">
                  SENSOR: {beforeSensor}
                </div>
              </div>
              <div className="h-1/2 relative overflow-hidden group">
                <img
                  src={afterImg}
                  alt="Epoch 2 Post-Change Satellite Raster"
                  className="w-full h-full object-cover opacity-85 filter contrast-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-4 bg-black/70 px-2 py-1 rounded font-mono text-[10px] text-amber-400 border border-amber-400/30">
                  EPOCH 2: {afterDate}
                </div>
                <div className="absolute top-3 right-4 bg-black/70 px-2 py-1 rounded font-mono text-[10px] text-slate-300 border border-white/10">
                  SENSOR: {afterSensor}
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Panel */}
          <div className="flex flex-col space-y-6 overflow-y-auto pr-4">
            <div>
              <h4 className="font-mono text-xs text-slate-500 tracking-widest mb-3">TARGET SITE</h4>
              <div className="font-mono text-sm text-white bg-white/5 p-4 rounded-lg border border-white/10">
                {evidence?.targetSite || 'Investigation Target'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <div className="font-mono text-[10px] text-slate-500 mb-1">LATITUDE</div>
                <div className="font-mono text-sm text-[#00d4ff]">{lat.toFixed(6)}°N</div>
              </div>
              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <div className="font-mono text-[10px] text-slate-500 mb-1">LONGITUDE</div>
                <div className="font-mono text-sm text-[#00d4ff]">{lon.toFixed(6)}°E</div>
              </div>
            </div>

            <div>
              <h4 className="font-mono text-xs text-slate-500 tracking-widest mb-3">CHANGE CLASSIFICATION</h4>
              <div className="bg-white/5 p-4 rounded-lg border border-white/10 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">CHANGE TYPE:</span>
                  <span className="text-amber-400 font-bold">{evidence?.changeType || 'Physical Ground Change'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">INTERVAL:</span>
                  <span className="text-slate-200">{evidence?.changeInterval || '2020–2024'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">ALGORITHM CONFIDENCE:</span>
                  <span className="text-[#22c55e] font-bold">
                    {Math.round((evidence?.confidence ?? 0.95) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-mono text-xs text-slate-500 tracking-widest mb-3">CONFIDENCE FACTORS</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white/5 p-3 rounded border border-white/5">
                  <span className="font-mono text-xs text-slate-300">CLOUD COVER (EPOCH 1)</span>
                  <span className="font-mono text-xs text-emerald-400">{beforeCloud}</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-3 rounded border border-white/5">
                  <span className="font-mono text-xs text-slate-300">CLOUD COVER (EPOCH 2)</span>
                  <span className="font-mono text-xs text-emerald-400">{afterCloud}</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-3 rounded border border-white/5">
                  <span className="font-mono text-xs text-slate-300">SUN ELEVATION ANGLE</span>
                  <span className="font-mono text-xs text-blue-400">{sunElev}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
