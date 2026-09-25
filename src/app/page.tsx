'use client';

import dynamic from 'next/dynamic';
import { QueryInterface } from '@/components/query/QueryInterface';
import { IntentLayer } from '@/components/query/IntentLayer';
import { Timeline } from '@/components/temporal/Timeline';
import { SiteComparison } from '@/components/temporal/SiteComparison';
import { ChangeVisualization } from '@/components/analysis/ChangeVisualization';
import { EvidenceView } from '@/components/analysis/EvidenceView';
import { ProvenanceView } from '@/components/provenance/ProvenanceView';
import { ResultView } from '@/components/review/ResultView';
import { ReportView } from '@/components/review/ReportView';
import { InvestigationTopNav } from '@/components/ui/InvestigationTopNav';
import { InvestigationContextControl } from '@/components/ui/InvestigationContextControl';
import { useInvestigationOrchestrator } from '@/hooks/useInvestigationOrchestrator';

const MapCanvas = dynamic(
  () => import('@/components/canvas/MapCanvas').then((m) => ({ default: m.MapCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-[#0a0a0f] flex items-center justify-center font-mono text-[#00d4ff] tracking-widest text-sm uppercase">
        Initializing GeoChronos Geospatial Engine…
      </div>
    ),
  }
);

const Site3DInspector = dynamic(
  () => import('@/components/3d/Site3DInspector').then((m) => ({ default: m.Site3DInspector })),
  { ssr: false }
);

export default function Home() {
  useInvestigationOrchestrator();

  return (
    <main className="w-screen h-screen overflow-hidden bg-[#0a0a0f] relative text-[#e8e8ec] select-none">
      {/* Primary Map Protagonist Canvas (Full Screen Viewport) */}
      <MapCanvas />

      {/* 3D Functional Instrumentation Layers */}
      <Site3DInspector />

      {/* Unified Top Navigation & Investigation Stage Ribbon */}
      <InvestigationTopNav />

      {/* Dynamic Investigation Flow Overlays & Contextual Direct Manipulation */}
      <QueryInterface />
      <IntentLayer />
      <Timeline />
      <SiteComparison />
      <ChangeVisualization />
      <EvidenceView />
      <ProvenanceView />
      <ResultView />
      <ReportView />

      {/* Contextual Canvas Action Control */}
      <InvestigationContextControl />
    </main>
  );
}
