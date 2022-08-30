import React from 'react'

import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls, Center, softShadows, Line } from '@react-three/drei'
import { PivotControls } from './pivot'

softShadows()

export default function App() {
  return (
    <Canvas shadows raycaster={{ params: { Line: { threshold: 0.15 } } }} camera={{ position: [-10, 10, 10], fov: 20 }}>
      <ambientLight intensity={0.5} />
      <directionalLight
        castShadow
        position={[2.5, 5, 5]}
        intensity={1.5}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={50}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />

      <mesh scale={20} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry />
        <shadowMaterial transparent opacity={0.5} />
      </mesh>

      <PivotControls
        //position={[0, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        anchor={[1, 1, -1]}
        axisLength={96}
        axisWidth={6}
        pixelValues
        userData={{ onHUD: true }}>
        <mesh castShadow receiveShadow position={[-1, 0.5, 1]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial />
        </mesh>
      </PivotControls>

      <OrbitControls makeDefault />
    </Canvas>
  )
}
