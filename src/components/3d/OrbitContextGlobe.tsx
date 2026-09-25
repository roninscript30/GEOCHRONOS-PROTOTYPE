'use client'

import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useInvestigationStore } from '@/store/investigation'

function EarthSphere({ targetCoord }: { targetCoord: [number, number] }) {
  const earthRef = useRef<THREE.Mesh>(null)
  const orbitRingRef = useRef<THREE.Group>(null)
  const satelliteRef = useRef<THREE.Mesh>(null)

  // Convert target lat/lon (Hyderabad: 78.465, 17.398) to 3D Cartesian on unit sphere r=1.5
  const targetPos = useMemo(() => {
    const [lon, lat] = targetCoord
    const r = 1.5
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lon + 180) * (Math.PI / 180)
    const x = -(r * Math.sin(phi) * Math.cos(theta))
    const z = r * Math.sin(phi) * Math.sin(theta)
    const y = r * Math.cos(phi)
    return new THREE.Vector3(x, y, z)
  }, [targetCoord])

  // Orbital trajectory points (Sun-synchronous orbit, inclined ~98.6 deg)
  const orbitPoints = useMemo(() => {
    const points: THREE.Vector3[] = []
    const radius = 1.85
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2
      const x = radius * Math.cos(angle)
      const y = radius * Math.sin(angle) * Math.cos(THREE.MathUtils.degToRad(80))
      const z = radius * Math.sin(angle) * Math.sin(THREE.MathUtils.degToRad(80))
      points.push(new THREE.Vector3(x, y, z))
    }
    return points
  }, [])

  const orbitGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(orbitPoints)
  }, [orbitPoints])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.4
    if (orbitRingRef.current) {
      orbitRingRef.current.rotation.y = t * 0.1
    }
    if (satelliteRef.current) {
      const radius = 1.85
      satelliteRef.current.position.x = radius * Math.cos(t)
      satelliteRef.current.position.y = radius * Math.sin(t) * Math.cos(THREE.MathUtils.degToRad(80))
      satelliteRef.current.position.z = radius * Math.sin(t) * Math.sin(THREE.MathUtils.degToRad(80))
    }
  })

  return (
    <group>
      {/* Base Globe Wireframe + Core */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#081020" wireframe={false} />
      </mesh>

      {/* Lat/Long Graticule Grid */}
      <mesh>
        <sphereGeometry args={[1.505, 24, 24]} />
        <meshBasicMaterial color="#00d4ff" wireframe transparent opacity={0.15} />
      </mesh>

      {/* Atmosphere Rim Glow */}
      <mesh scale={[1.08, 1.08, 1.08]}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Target Investigation Marker on Globe */}
      <mesh position={targetPos}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#00d4ff" />
      </mesh>

      {/* Target Marker Pulse Ring */}
      <mesh position={targetPos}>
        <ringGeometry args={[0.06, 0.08, 32]} />
        <meshBasicMaterial color="#22c55e" side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>

      {/* Orbital Path Line */}
      <group ref={orbitRingRef}>
        {/* Orbit track line */}
        {/* @ts-ignore line geometry */}
        <line geometry={orbitGeometry}>
          <lineBasicMaterial color="#f59e0b" transparent opacity={0.6} />
        </line>
      </group>

      {/* Sentinel-2 Satellite Marker */}
      <mesh ref={satelliteRef}>
        <boxGeometry args={[0.07, 0.04, 0.04]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
    </group>
  )
}

export function OrbitContextGlobe() {
  const { state, selectedCandidate } = useInvestigationStore()

  const isVisible = [
    'QUERY',
    'INTENT',
    'SEARCH_CONTEXT',
    'MAP_GENERATION',
    'DISCOVERY',
    'CANDIDATES',
    'SITE_SELECTION',
    'EVIDENCE',
    'PROVENANCE',
  ].includes(state)

  if (!isVisible) return null

  const coords = selectedCandidate ? selectedCandidate.coordinates : [80.2385, 13.0195] as [number, number]

  return (
    <div className="absolute top-20 left-6 z-30 w-56 h-56 rounded-xl bg-[#0a0a0f]/80 backdrop-blur-md border border-[#00d4ff]/25 shadow-2xl overflow-hidden font-mono flex flex-col">
      {/* Header Badge */}
      <div className="px-3 py-1.5 border-b border-[#00d4ff]/20 bg-[#12121a]/60 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-ping" />
          <span className="text-[#00d4ff] font-bold tracking-wider">SENTINEL-2A</span>
        </div>
        <span className="text-[#6b6b80]">ORBIT 142</span>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
        <Canvas
          camera={{ position: [0, 1.2, 3.5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.8} />
          <pointLight position={[5, 5, 5]} intensity={1.5} color="#00d4ff" />
          <EarthSphere targetCoord={coords} />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
        </Canvas>

        {/* HUD Coordinate Crosshair */}
        <div className="absolute bottom-2 left-2 text-[9px] text-[#e8e8ec]/70 pointer-events-none">
          <div>LOC: {coords[1].toFixed(2)}°N, {coords[0].toFixed(2)}°E</div>
          <div className="text-[#00d4ff]">ALT: 786 KM (LEO)</div>
        </div>
      </div>
    </div>
  )
}
