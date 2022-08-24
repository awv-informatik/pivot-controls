import React from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { Gizmo } from './PivotControls'

export default function App() {
  const [matrix2, setMatrix2] = React.useState(new THREE.Matrix4())

  const callback1 = React.useCallback((local: THREE.Matrix4, deltaL: THREE.Matrix4, world: THREE.Matrix4, deltaW: THREE.Matrix4) => {
    /* setMatrix1(local.clone()) */
  }, [])

  const callback2 = React.useCallback((local: THREE.Matrix4, deltaL: THREE.Matrix4, world: THREE.Matrix4, deltaW: THREE.Matrix4) => {
    setMatrix2(local.clone())
  }, [])

  const gizmo3Ref = React.useRef<THREE.Group>(null!)
  const callback3 = React.useCallback((local: THREE.Matrix4, deltaL: THREE.Matrix4, world: THREE.Matrix4, deltaW: THREE.Matrix4) => {
    gizmo3Ref.current.matrix.copy(world)
  }, [])

  const matrix = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(-1, -1, 0).normalize(), 1).setPosition(20, 20, 20)

  return (
    <Canvas orthographic raycaster={{ params: { Line: { threshold: 0.05 } } }} camera={{ position: [50, 50, 50], zoom: 3 }}>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight position={[-10, -10, -10]} />
      <group matrix={matrix} matrixAutoUpdate={false}>
        <Gizmo
          /* matrix={matrix1} */
          onDrag={callback1}
          autoTransform
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
      <group ref={gizmo3Ref} matrixAutoUpdate={false}>
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
