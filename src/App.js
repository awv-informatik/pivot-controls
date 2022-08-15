import * as THREE from 'three'
import { useRef, useState, useMemo, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Edges } from '@react-three/drei'

const calculateOffset = (clickPoint, normal, rayStart, rayDir) => {
  const e1 = normal.dot(normal)
  const e2 = normal.dot(clickPoint) - normal.dot(rayStart)
  const e3 = normal.dot(rayDir)

  const e1V = rayDir
    .clone()
    .multiplyScalar(e1 / e3)
    .sub(normal)
  const e2V = rayDir
    .clone()
    .multiplyScalar(e2 / e3)
    .add(rayStart)
    .sub(clickPoint)

  const offset = -e1V.dot(e2V) / e1V.dot(e1V)

  return offset
}

const calculateAngle = (clickPoint, intersectionPoint, origin, e1, e2) => {
  const clickDir = clickPoint.clone().sub(origin)
  const intersectionDir = intersectionPoint.clone().sub(origin)

  const dote1e1 = e1.dot(e1)
  const dote2e2 = e2.dot(e2)

  const uClick = clickDir.dot(e1) / dote1e1
  const vClick = clickDir.dot(e2) / dote2e2

  const uIntersection = intersectionDir.dot(e1) / dote1e1
  const vIntersection = intersectionDir.dot(e2) / dote2e2

  const angleClick = Math.atan2(vClick, uClick)
  const angleIntersection = Math.atan2(vIntersection, uIntersection)

  return angleIntersection - angleClick
}

const Point = ({ position, radius, color, opacity = 1, handlers, userData }) => {
  return (
    <mesh position={position.clone()} userData={userData} {...handlers}>
      <sphereGeometry attach="geometry" args={[radius, 32, 16]} />
      <meshBasicMaterial attach="material" color={color} opacity={opacity} transparent={opacity < 1} />
    </mesh>
  )
}

const Arrow = ({ position, direction, length, width, color, opacity = 1, handlers, userData, withCone = true }) => {
  const cylinderWith = width
  const coneWidth = cylinderWith * 1.5
  const coneLength = Math.min(coneWidth / 0.12, length / 2.0)
  const cylinderLength = withCone ? length - coneLength : length

  return (
    <group
      position={position.clone()}
      quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize())}
      {...handlers}
      userData={userData}>
      <mesh position={new THREE.Vector3(0, cylinderLength / 2.0, 0)} renderOrder={500} userData={userData}>
        <cylinderGeometry attach="geometry" args={[cylinderWith, cylinderWith, cylinderLength, 24, 1]} />
        <meshBasicMaterial attach="material" color={color} opacity={opacity} transparent={true} />
      </mesh>
      {withCone && (
        <mesh position={new THREE.Vector3(0, cylinderLength + coneLength / 2.0, 0)} renderOrder={500} userData={userData}>
          <coneGeometry attach="geometry" args={[coneWidth, coneLength, 24, 1]} />
          <meshBasicMaterial attach="material" color={color} opacity={opacity} transparent={opacity < 1} />
        </mesh>
      )}
    </group>
  )
}

const OriginPoint = ({ position, color, opacity = 1, handlers, userData }) => {
  return (
    <Point
      position={position ? position.clone() : new THREE.Vector3()}
      radius={1}
      color={color}
      opacity={opacity}
      handlers={handlers}
      userData={userData}
    />
  )
}

const AxisArrow = ({
  position,
  direction,
  applyDelta,
  updateTransform,
  color,
  opacity = 1,
  handlers,
  userData,
  length,
  width,
  withCone = true
}) => {
  const camControls = useThree((state) => state.controls)

  const objRef = useRef(null)
  const clickInfo = useRef(null)

  const [isHovered, setIsHovered] = useState(false)

  const onPointerDown = useCallback(
    (e) => {
      e.stopPropagation()

      const rotation = new THREE.Matrix4().extractRotation(objRef.current?.matrixWorld)
      const clickPoint = e.point.clone()
      const dir = direction.clone().applyMatrix4(rotation).normalize()

      clickInfo.current = { clickPoint, dir }

      camControls && (camControls.enabled = false)
      e.target.setPointerCapture(e.pointerId)
    },
    [direction, camControls]
  )

  const onPointerMove = useCallback(
    (e) => {
      e.stopPropagation()

      if (!isHovered) {
        setIsHovered(true)
      }

      if (clickInfo.current) {
        const { clickPoint, dir } = clickInfo.current

        const offset = calculateOffset(clickPoint, dir, e.ray.origin, e.ray.direction)
        const offsetMatrix = new THREE.Matrix4().makeTranslation(dir.x * offset, dir.y * offset, dir.z * offset)

        applyDelta(offsetMatrix)
      }
    },
    [applyDelta, isHovered]
  )

  const onPointerUp = useCallback(
    (e) => {
      e.stopPropagation()

      updateTransform()

      clickInfo.current = null
      camControls && (camControls.enabled = true)
      e.target.releasePointerCapture(e.pointerId)
    },
    [camControls, updateTransform]
  )

  const onPointerOut = useCallback((e) => {
    e.stopPropagation()

    setIsHovered(false)
  }, [])

  const color_ = isHovered ? 0xd5d528 : color

  return (
    <group ref={objRef}>
      <Arrow
        position={position ? position.clone() : new THREE.Vector3()}
        direction={direction.clone()}
        length={length || 21}
        width={width || 1}
        color={color_}
        opacity={opacity}
        handlers={{ onPointerDown, onPointerMove, onPointerUp, onPointerOut }}
        userData={userData}
        withCone={withCone}
      />
    </group>
  )
}

const PlaneSlider = ({ dir1, dir2, applyDelta, updateTransform, length, width, color }) => {
  const camControls = useThree((state) => state.controls)

  const objRef = useRef(null)
  const clickInfo = useRef(null)

  const [isHovered, setIsHovered] = useState(false)

  const onPointerDown = useCallback(
    (e) => {
      e.stopPropagation()

      const clickPoint = e.point.clone()
      const origin = new THREE.Vector3().setFromMatrixPosition(objRef.current?.matrixWorld)
      const normal = new THREE.Vector3().setFromMatrixColumn(objRef.current?.matrixWorld, 2).normalize()
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, origin)

      clickInfo.current = { clickPoint, plane }

      camControls && (camControls.enabled = false)
      e.target.setPointerCapture(e.pointerId)
    },
    [camControls]
  )

  const onPointerMove = useCallback(
    (e) => {
      e.stopPropagation()

      if (!isHovered) {
        setIsHovered(true)
      }

      if (clickInfo.current) {
        const { clickPoint, plane } = clickInfo.current

        const ray = e.ray.clone()
        const intersection = new THREE.Vector3()
        ray.intersectPlane(plane, intersection)
        ray.direction.negate()
        ray.intersectPlane(plane, intersection)

        const offsetV = intersection.clone().sub(clickPoint)
        const offsetMatrix = new THREE.Matrix4().makeTranslation(offsetV.x, offsetV.y, offsetV.z)

        applyDelta(offsetMatrix)
      }
    },
    [applyDelta, isHovered]
  )

  const onPointerUp = useCallback(
    (e) => {
      e.stopPropagation()

      updateTransform()

      clickInfo.current = null
      camControls && (camControls.enabled = true)
      e.target.releasePointerCapture(e.pointerId)
    },
    [camControls, updateTransform]
  )

  const onPointerOut = useCallback((e) => {
    e.stopPropagation()

    setIsHovered(false)
  }, [])

  const matrixL = useMemo(() => {
    const dir1N = dir1.clone().normalize()
    const dir2N = dir2.clone().normalize()
    return new THREE.Matrix4().makeBasis(dir1N, dir2N, dir1N.clone().cross(dir2N))
  }, [dir1, dir2])

  const color_ = isHovered ? 0xd5d528 : color

  return (
    <group
      ref={objRef}
      matrix={matrixL}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerOut={onPointerOut}
      matrixAutoUpdate={false}>
      <mesh position={new THREE.Vector3(length - width / 2, length / 2, 0)}>
        <planeGeometry args={[width, length]} />
        <meshBasicMaterial color={color_} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={new THREE.Vector3((length - width) / 2, length - width / 2, 0)}>
        <planeGeometry args={[length - width, width]} />
        <meshBasicMaterial color={color_} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

const AxisRotator = ({ dir1, dir2, applyDelta, updateTransform, radius, width, color }) => {
  const camControls = useThree((state) => state.controls)

  const objRef = useRef(null)
  const clickInfo = useRef(null)

  const [isHovered, setIsHovered] = useState(false)

  const onPointerDown = useCallback(
    (e) => {
      e.stopPropagation()

      const clickPoint = e.point.clone()
      const origin = new THREE.Vector3().setFromMatrixPosition(objRef.current?.matrixWorld)
      const e1 = new THREE.Vector3().setFromMatrixColumn(objRef.current?.matrixWorld, 0).normalize()
      const e2 = new THREE.Vector3().setFromMatrixColumn(objRef.current?.matrixWorld, 1).normalize()
      const normal = new THREE.Vector3().setFromMatrixColumn(objRef.current?.matrixWorld, 2).normalize()
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, origin)

      clickInfo.current = { clickPoint, origin, e1, e2, normal, plane }

      camControls && (camControls.enabled = false)
      e.target.setPointerCapture(e.pointerId)
    },
    [camControls]
  )

  const onPointerMove = useCallback(
    (e) => {
      e.stopPropagation()

      if (!isHovered) {
        setIsHovered(true)
      }

      if (clickInfo.current) {
        const { clickPoint, origin, e1, e2, normal, plane } = clickInfo.current
        const ray = e.ray.clone()
        const intersection = new THREE.Vector3()
        ray.intersectPlane(plane, intersection)
        ray.direction.negate()
        ray.intersectPlane(plane, intersection)

        const angle = calculateAngle(clickPoint, intersection, origin, e1, e2)

        const rotMatrix = new THREE.Matrix4().makeRotationAxis(normal, angle)
        const posNew = origin.clone().applyMatrix4(rotMatrix).sub(origin).negate()
        rotMatrix.setPosition(posNew)

        applyDelta(rotMatrix)
      }
    },
    [applyDelta, isHovered]
  )

  const onPointerUp = useCallback(
    (e) => {
      e.stopPropagation()

      updateTransform()

      clickInfo.current = null
      camControls && (camControls.enabled = true)
      e.target.releasePointerCapture(e.pointerId)
    },
    [camControls, updateTransform]
  )

  const onPointerOut = useCallback((e) => {
    e.stopPropagation()

    setIsHovered(false)
  }, [])

  const matrixL = useMemo(() => {
    const dir1N = dir1.clone().normalize()
    const dir2N = dir2.clone().normalize()
    return new THREE.Matrix4().makeBasis(dir1N, dir2N, dir1N.clone().cross(dir2N))
  }, [dir1, dir2])

  const color_ = isHovered ? 0xd5d528 : color

  return (
    <group
      ref={objRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerOut={onPointerOut}
      matrix={matrixL}
      matrixAutoUpdate={false}>
      <mesh>
        <ringGeometry args={[radius - width, radius, 16, 1, 0, Math.PI / 2]} />
        <meshBasicMaterial color={color_} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

const Gizmo = ({
  matrix,
  callback,
  offset = [0, 0, 0],
  axisLength = 32,
  sliderLength = 10,
  sliderWidth = 3,
  rotatorRadius = 19,
  rotatorWidth = 3,
  axisColors = [0xd52828, 0x28a628, 0x2828d7],
  children
}) => {
  const ref = useRef(null)
  const childrenRef = useRef(null)

  // Local gizmo matrix before applying the delta
  const original = useRef(matrix.clone())

  const applyDelta = useCallback(
    (deltaW) => {
      const parent = ref.current?.matrixWorld
      const parentInv = parent.clone().invert()
      // After applying the delta
      const world = original.current.clone().premultiply(parent).premultiply(deltaW)
      const local = world.clone().premultiply(parentInv)
      const originalInv = original.current.clone().invert()
      const deltaL = local.clone().multiply(originalInv)

      callback(local, deltaL, world, deltaW)
    },
    [callback]
  )

  const updateTransform = useCallback(() => {
    original.current = matrix.clone()
  }, [matrix])

  const offsetMatrix = useMemo(() => new THREE.Matrix4().setPosition(...offset), [offset])

  return (
    <group ref={ref}>
      <group matrix={matrix} matrixAutoUpdate={false}>
        <group matrix={offsetMatrix} matrixAutoUpdate={false}>
          <OriginPoint position={new THREE.Vector3()} color={0x000000} />
          <AxisArrow
            position={new THREE.Vector3()}
            direction={new THREE.Vector3(1, 0, 0)}
            applyDelta={applyDelta}
            updateTransform={updateTransform}
            length={axisLength}
            color={axisColors[0]}
          />
          <AxisArrow
            position={new THREE.Vector3()}
            direction={new THREE.Vector3(0, 1, 0)}
            applyDelta={applyDelta}
            updateTransform={updateTransform}
            length={axisLength}
            color={axisColors[1]}
          />
          <AxisArrow
            position={new THREE.Vector3()}
            direction={new THREE.Vector3(0, 0, 1)}
            applyDelta={applyDelta}
            updateTransform={updateTransform}
            length={axisLength}
            color={axisColors[2]}
          />
          <PlaneSlider
            dir1={new THREE.Vector3(1, 0, 0)}
            dir2={new THREE.Vector3(0, 1, 0)}
            applyDelta={applyDelta}
            updateTransform={updateTransform}
            length={sliderLength}
            width={sliderWidth}
            color={axisColors[2]}
          />
          <PlaneSlider
            dir1={new THREE.Vector3(0, 0, 1)}
            dir2={new THREE.Vector3(1, 0, 0)}
            applyDelta={applyDelta}
            updateTransform={updateTransform}
            length={sliderLength}
            width={sliderWidth}
            color={axisColors[1]}
          />
          <PlaneSlider
            dir1={new THREE.Vector3(0, 1, 0)}
            dir2={new THREE.Vector3(0, 0, 1)}
            applyDelta={applyDelta}
            updateTransform={updateTransform}
            length={sliderLength}
            width={sliderWidth}
            color={axisColors[0]}
          />
          <AxisRotator
            dir1={new THREE.Vector3(1, 0, 0)}
            dir2={new THREE.Vector3(0, 1, 0)}
            applyDelta={applyDelta}
            updateTransform={updateTransform}
            radius={rotatorRadius}
            width={rotatorWidth}
            color={axisColors[2]}
          />
          <AxisRotator
            dir1={new THREE.Vector3(0, 0, 1)}
            dir2={new THREE.Vector3(1, 0, 0)}
            applyDelta={applyDelta}
            updateTransform={updateTransform}
            radius={rotatorRadius}
            width={rotatorWidth}
            color={axisColors[1]}
          />
          <AxisRotator
            dir1={new THREE.Vector3(0, 1, 0)}
            dir2={new THREE.Vector3(0, 0, 1)}
            applyDelta={applyDelta}
            updateTransform={updateTransform}
            radius={rotatorRadius}
            width={rotatorWidth}
            color={axisColors[0]}
          />
        </group>
        <group ref={childrenRef}>{children}</group>
      </group>
    </group>
  )
}

export default function App() {
  const [matrix1, setMatrix1] = useState(new THREE.Matrix4())
  const [matrix2, setMatrix2] = useState(new THREE.Matrix4())
  const [matrix3, setMatrix3] = useState(new THREE.Matrix4())

  const callback1 = useCallback((local, deltaL, world, deltaW) => {
    setMatrix1(local)
  }, [])

  const callback2 = useCallback((local, deltaL, world, deltaW) => {
    setMatrix2(local)
  }, [])

  const callback3 = useCallback((local, deltaL, world, deltaW) => {
    setMatrix3(local)
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
          callback={callback1}
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
        <Gizmo matrix={matrix2} callback={callback2} />
      </group>
      <Gizmo matrix={matrix3} callback={callback3} offset={[0, 40, 0]}>
        <mesh position={[0, -30, 0]}>
          <boxGeometry args={[50, 50, 50]} />
          <meshBasicMaterial />
          <Edges />
        </mesh>
      </Gizmo>
    </Canvas>
  )
}
