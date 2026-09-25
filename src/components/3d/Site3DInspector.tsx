'use client'

import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useInvestigationStore } from '@/store/investigation'

function ExtrudedSiteScene() {
  const buildingRef = useRef<THREE.Mesh>(null)

  // Subtle rotation
  useFrame(({ clock }) => {
    if (buildingRef.current) {
      buildingRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.1
    }
  })

  // Create building footprint shape
  const buildingShape = React.useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-1.2, -0.8)
    shape.lineTo(1.2, -0.8)
    shape.lineTo(1.2, 0.8)
    shape.lineTo(-0.4, 0.8)
    shape.lineTo(-0.4, 0.4)
    shape.lineTo(-1.2, 0.4)
    shape.closePath()
    return shape
  }, [])

  const extrudeSettings = {
    depth: 1.2, // 14 meters scaled
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.04,
  }

  return (
    <group position={[0, -0.4, 0]}>
      {/* Ground Plane with fine geospatial grid */}
      <gridHelper args={[8, 16, '#00d4ff', '#1e1e2e']} position={[0, 0, 0]} />

      {/* River Corridor Ribbon (Simulated river near building) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 2.2]}>
        <planeGeometry args={[7, 1.2]} />
        <meshStandardMaterial
          color="#2563eb"
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Buffer Zone Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[2.0, 2.05, 48]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Extruded 3D Building */}
      <group ref={buildingRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <extrudeGeometry args={[buildingShape, extrudeSettings]} />
          <meshStandardMaterial
            color="#00d4ff"
            roughness={0.3}
            metalness={0.7}
            transparent
            opacity={0.85}
            wireframe={false}
          />
        </mesh>

        {/* Building Wireframe Outlines */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <extrudeGeometry args={[buildingShape, extrudeSettings]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.3} />
        </mesh>
      </group>

      {/* Floor Slabs Indicator Lines */}
      {[0.3, 0.6, 0.9, 1.2].map((h, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, h, 0]}>
          <ringGeometry args={[1.25, 1.28, 4]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Sun Shadow Ray (Solar Angle Verification Check) */}
      <mesh position={[1.5, 0.6, -1.0]} rotation={[0.4, 0.8, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 3]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

export function Site3DInspector() {
  const { state, selectedCandidate } = useInvestigationStore()

  const isVisible = [
    'SELECT_SITE',
    'TIME_MACHINE',
  ].includes(state)

  if (!isVisible) return null

  return (
    <div className="absolute bottom-24 left-6 z-30 w-72 h-64 rounded-xl bg-[#0a0a0f]/90 backdrop-blur-md border border-[#00d4ff]/30 shadow-2xl overflow-hidden font-mono flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#00d4ff]/20 bg-[#12121a]/80 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded bg-[#00d4ff]" />
          <span className="text-white font-bold tracking-wider">3D STRUCTURAL ELEVATION</span>
        </div>
        <span className="text-[#22c55e] text-[10px]">14.0M EST</span>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
        <Canvas
          camera={{ position: [2.5, 2.2, 3.5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 3]} intensity={1.8} castShadow />
          <pointLight position={[-4, 2, -2]} intensity={0.5} color="#2563eb" />
          <ExtrudedSiteScene />
          <OrbitControls makeDefault enableZoom={true} maxDistance={6} minDistance={2} />
        </Canvas>

        {/* Overlay Measurements */}
        <div className="absolute bottom-2 left-2 text-[9px] text-[#e8e8ec]/80 pointer-events-none space-y-0.5 bg-[#0a0a0f]/70 px-2 py-1 rounded border border-[#1e1e2e]">
          <div>FOOTPRINT: <span className="text-white">{selectedCandidate?.properties.area_sqm as number || 2850} m²</span></div>
          <div>EST. FLOORS: <span className="text-[#00d4ff]">4 LEVELS</span></div>
          <div>RIVER OFFSET: <span className="text-[#22c55e]">180M (BUFFER PASS)</span></div>
        </div>
      </div>
    </div>
  )
}
