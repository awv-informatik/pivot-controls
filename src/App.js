import * as THREE from 'three'
import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { Gizmo } from './PivotControls'

export default function App() {
  const [matrix1, setMatrix1] = useState(new THREE.Matrix4())
  const [matrix2, setMatrix2] = useState(new THREE.Matrix4())
  const [matrix3, setMatrix3] = useState(new THREE.Matrix4())

  const callback1 = useCallback((local, deltaL, world, deltaW) => {
    setMatrix1(local.clone())
  }, [])

  const callback2 = useCallback((local, deltaL, world, deltaW) => {
    setMatrix2(local.clone())
  }, [])

  const callback3 = useCallback((local, deltaL, world, deltaW) => {
    setMatrix3(world.clone())
  }, [])

  const matrix = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(-1, -1, 0).normalize(), 1).setPosition(20, 20, 20)

  return (
    <Canvas orthographic raycaster={{ params: { Line: { threshold: 0.05 } } }} camera={{ position: [50, 50, 50], zoom: 3 }}>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight position={[-10, -10, -10]} />
      <group matrix={matrix} matrixAutoUpdate={false}>
        <Gizmo
          matrix={matrix1}
          onDrag={callback1}
          axisColors={[0x444444, 0xdd3333, 0x444444]}
          axisLength={19}
          sliderLength={8}
          sliderWidth={8}
          rotatorWidth={5}>
          <mesh position={[0, -30, 0]}>
            <boxGeometry args={[50, 50, 50]} />
            <meshBasicMaterial />
            <Edges />
          </mesh>
        </Gizmo>
        <group matrix={matrix2} matrixAutoUpdate={false}>
          <mesh position={[0, -30, 0]}>
            <boxGeometry args={[50, 50, 50]} />
            <meshBasicMaterial />
            <Edges />
          </mesh>
        </group>
        <Gizmo matrix={matrix2} onDrag={callback2} offset={[0, 30, 0]} />
      </group>
      <group matrix={matrix3} matrixAutoUpdate={false}>
        <Gizmo anchor={[1, -1, -1]} onDrag={callback3} offset={[0, 30, 0]} rotation={[1, 1, 1]}>
          <mesh position={[0, -30, 0]}>
            <boxGeometry args={[50, 50, 50]} />
            <meshBasicMaterial />
            <Edges />
          </mesh>
        </Gizmo>
      </group>
    </Canvas>
  )
}
