import * as THREE from 'three'
import { useRef, useState, useMemo, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

const vec1 = new THREE.Vector3()
const vec2 = new THREE.Vector3()

const calculateOffset = (clickPoint, normal, rayStart, rayDir) => {
  const e1 = normal.dot(normal)
  const e2 = normal.dot(clickPoint) - normal.dot(rayStart)
  const e3 = normal.dot(rayDir)

  vec1
    .copy(rayDir)
    .multiplyScalar(e1 / e3)
    .sub(normal)
  vec2
    .copy(rayDir)
    .multiplyScalar(e2 / e3)
    .add(rayStart)
    .sub(clickPoint)

  const offset = -vec1.dot(vec2) / vec1.dot(vec1)

  return offset
}

const clickDir = new THREE.Vector3()
const intersectionDir = new THREE.Vector3()

const calculateAngle = (clickPoint, intersectionPoint, origin, e1, e2) => {
  clickDir.copy(clickPoint).sub(origin)
  intersectionDir.copy(intersectionPoint).sub(origin)

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

const Origin = ({ color, opacity = 1 }) => {
  return (
    <mesh>
      <sphereGeometry args={[1, 32, 16]} />
      <meshBasicMaterial color={color} opacity={opacity} transparent={opacity < 1} />
    </mesh>
  )
}

const upV = new THREE.Vector3(0, 1, 0)
const offsetMatrix = new THREE.Matrix4()

const AxisArrow = ({
  direction,
  onDragStart,
  onDrag,
  onDragEnd,
  length = 21,
  width = 1,
  withCone = true,
  color,
  hoveredColor,
  opacity = 1
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

      onDragStart()

      camControls && (camControls.enabled = false)
      e.target.setPointerCapture(e.pointerId)
    },
    [direction, camControls, onDragStart]
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
        offsetMatrix.makeTranslation(dir.x * offset, dir.y * offset, dir.z * offset)

        onDrag(offsetMatrix)
      }
    },
    [onDrag, isHovered]
  )

  const onPointerUp = useCallback(
    (e) => {
      e.stopPropagation()

      clickInfo.current = null

      onDragEnd()

      camControls && (camControls.enabled = true)
      e.target.releasePointerCapture(e.pointerId)
    },
    [camControls, onDragEnd]
  )

  const onPointerOut = useCallback((e) => {
    e.stopPropagation()

    setIsHovered(false)
  }, [])

  const { cylinderWidth, cylinderLength, coneWidth, coneLength, matrixL } = useMemo(() => {
    const cylinderWidth_ = width
    const coneWidth_ = cylinderWidth_ * 1.5
    const coneLength_ = Math.min(coneWidth_ / 0.12, length / 2.0)
    const cylinderLength_ = withCone ? length - coneLength_ : length
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upV, direction.clone().normalize())
    const matrixL_ = new THREE.Matrix4().makeRotationFromQuaternion(quaternion)

    return {
      cylinderWidth: cylinderWidth_,
      cylinderLength: cylinderLength_,
      coneWidth: coneWidth_,
      coneLength: coneLength_,
      matrixL: matrixL_
    }
  }, [direction, length, width, withCone])

  const color_ = isHovered ? hoveredColor : color

  return (
    <group ref={objRef}>
      <group
        matrix={matrixL}
        matrixAutoUpdate={false}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerOut={onPointerOut}>
        <mesh position={[0, cylinderLength / 2.0, 0]} renderOrder={500}>
          <cylinderGeometry args={[cylinderWidth, cylinderWidth, cylinderLength, 24, 1]} />
          <meshBasicMaterial color={color_} opacity={opacity} transparent={opacity < 1} />
        </mesh>
        {withCone && (
          <mesh position={[0, cylinderLength + coneLength / 2.0, 0]} renderOrder={500}>
            <coneGeometry args={[coneWidth, coneLength, 24, 1]} />
            <meshBasicMaterial color={color_} opacity={opacity} transparent={opacity < 1} />
          </mesh>
        )}
      </group>
    </group>
  )
}

const ray = new THREE.Ray()
const intersection = new THREE.Vector3()

const PlaneSlider = ({ dir1, dir2, onDragStart, onDrag, onDragEnd, length, width, color, hoveredColor, opacity = 1 }) => {
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

      onDragStart()

      camControls && (camControls.enabled = false)
      e.target.setPointerCapture(e.pointerId)
    },
    [camControls, onDragStart]
  )

  const onPointerMove = useCallback(
    (e) => {
      e.stopPropagation()

      if (!isHovered) {
        setIsHovered(true)
      }

      if (clickInfo.current) {
        const { clickPoint, plane } = clickInfo.current

        ray.copy(e.ray)
        ray.intersectPlane(plane, intersection)
        ray.direction.negate()
        ray.intersectPlane(plane, intersection)

        intersection.sub(clickPoint)
        offsetMatrix.makeTranslation(intersection.x, intersection.y, intersection.z)

        onDrag(offsetMatrix)
      }
    },
    [onDrag, isHovered]
  )

  const onPointerUp = useCallback(
    (e) => {
      e.stopPropagation()

      clickInfo.current = null

      onDragEnd()

      camControls && (camControls.enabled = true)
      e.target.releasePointerCapture(e.pointerId)
    },
    [camControls, onDragEnd]
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

  const color_ = isHovered ? hoveredColor : color

  return (
    <group
      ref={objRef}
      matrix={matrixL}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerOut={onPointerOut}
      matrixAutoUpdate={false}>
      <mesh position={[length - width / 2, length / 2, 0]}>
        <planeGeometry args={[width, length]} />
        <meshBasicMaterial color={color_} opacity={opacity} transparent={opacity < 1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[(length - width) / 2, length - width / 2, 0]}>
        <planeGeometry args={[length - width, width]} />
        <meshBasicMaterial color={color_} opacity={opacity} transparent={opacity < 1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

const rotMatrix = new THREE.Matrix4()
const posNew = new THREE.Vector3()

const AxisRotator = ({ dir1, dir2, onDragStart, onDrag, onDragEnd, radius, width, color, hoveredColor, opacity = 1 }) => {
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

      onDragStart()

      camControls && (camControls.enabled = false)
      e.target.setPointerCapture(e.pointerId)
    },
    [camControls, onDragStart]
  )

  const onPointerMove = useCallback(
    (e) => {
      e.stopPropagation()

      if (!isHovered) {
        setIsHovered(true)
      }

      if (clickInfo.current) {
        const { clickPoint, origin, e1, e2, normal, plane } = clickInfo.current

        ray.copy(e.ray)
        ray.intersectPlane(plane, intersection)
        ray.direction.negate()
        ray.intersectPlane(plane, intersection)

        const angle = calculateAngle(clickPoint, intersection, origin, e1, e2)

        rotMatrix.makeRotationAxis(normal, angle)
        posNew.copy(origin).applyMatrix4(rotMatrix).sub(origin).negate()
        rotMatrix.setPosition(posNew)

        onDrag(rotMatrix)
      }
    },
    [onDrag, isHovered]
  )

  const onPointerUp = useCallback(
    (e) => {
      e.stopPropagation()

      clickInfo.current = null

      onDragEnd()

      camControls && (camControls.enabled = true)
      e.target.releasePointerCapture(e.pointerId)
    },
    [camControls, onDragEnd]
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

  const color_ = isHovered ? hoveredColor : color

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
        <meshBasicMaterial color={color_} opacity={opacity} transparent={opacity < 1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

const mL0 = new THREE.Matrix4()
const mW0 = new THREE.Matrix4()
const mP = new THREE.Matrix4()
const mPInv = new THREE.Matrix4()
const mW = new THREE.Matrix4()
const mL = new THREE.Matrix4()
const mL0Inv = new THREE.Matrix4()
const mdL = new THREE.Matrix4()

const bb = new THREE.Box3()
const bbObj = new THREE.Box3()
const center = new THREE.Vector3()
const size = new THREE.Vector3()
const anchorOffset = new THREE.Vector3()
const position = new THREE.Vector3()

const xDir = new THREE.Vector3(1, 0, 0)
const yDir = new THREE.Vector3(0, 1, 0)
const zDir = new THREE.Vector3(0, 0, 1)

const Gizmo = ({
  matrix,
  onDragStart,
  onDrag,
  onDragEnd,
  anchor,
  offset = [0, 0, 0],
  rotation = [0, 0, 0],
  axisLength = 32,
  sliderLength = 10,
  sliderWidth = 3,
  rotatorRadius = 19,
  rotatorWidth = 3,
  axisColors = [0xd52828, 0x28a628, 0x2828d7],
  hoveredColor = 0xd5d528,
  opacity = 1,
  children
}) => {
  const parentRef = useRef(null)
  const ref = useRef(null)
  const gizmoRef = useRef(null)
  const childrenRef = useRef(null)

  const onDragStart_ = useCallback(() => {
    mL0.copy(ref.current.matrix)
    mW0.copy(ref.current.matrixWorld)

    onDragStart && onDragStart()
  }, [onDragStart])

  const onDrag_ = useCallback(
    (mdW) => {
      mP.copy(parentRef.current.matrixWorld)
      mPInv.copy(mP).invert()
      // After applying the delta
      mW.copy(mW0).premultiply(mdW)
      mL.copy(mW).premultiply(mPInv)
      mL0Inv.copy(mL0).invert()
      mdL.copy(mL).multiply(mL0Inv)

      onDrag && onDrag(mL, mdL, mW, mdW)
    },
    [onDrag]
  )

  const onDragEnd_ = useCallback(() => {
    onDragEnd && onDragEnd()
  }, [onDragEnd])

  // TODO: I don't like this useframe
  useFrame(() => {
    if (!anchor) {
      return
    }

    mPInv.copy(childrenRef.current.matrixWorld).invert()

    childrenRef.current.traverse((obj) => {
      if (!obj.geometry) {
        return
      }

      if (!obj.geometry.boundingBox) {
        obj.geometry.computeBoundingBox()
      }

      mL.copy(obj.matrixWorld).premultiply(mPInv)

      bbObj.copy(obj.geometry.boundingBox)
      bbObj.applyMatrix4(mL)
      bb.union(bbObj)
    })

    center.copy(bb.max).add(bb.min).multiplyScalar(0.5)
    size.copy(bb.max).sub(bb.min).multiplyScalar(0.5)
    anchorOffset
      .copy(size)
      .multiply(new THREE.Vector3(...anchor))
      .add(center)
    position.set(...offset).add(anchorOffset)

    gizmoRef.current.position.copy(position)
  })

  return (
    <group ref={parentRef}>
      <group ref={ref} matrix={matrix} matrixAutoUpdate={false}>
        <group ref={gizmoRef} position={offset} rotation={rotation}>
          <Origin color={0x000000} opacity={opacity} />
          <AxisArrow
            direction={xDir}
            onDragStart={onDragStart_}
            onDrag={onDrag_}
            onDragEnd={onDragEnd_}
            length={axisLength}
            color={axisColors[0]}
            hoveredColor={hoveredColor}
            opacity={opacity}
          />
          <AxisArrow
            direction={yDir}
            onDragStart={onDragStart_}
            onDrag={onDrag_}
            onDragEnd={onDragEnd_}
            length={axisLength}
            color={axisColors[1]}
            hoveredColor={hoveredColor}
            opacity={opacity}
          />
          <AxisArrow
            direction={zDir}
            onDragStart={onDragStart_}
            onDrag={onDrag_}
            onDragEnd={onDragEnd_}
            length={axisLength}
            color={axisColors[2]}
            hoveredColor={hoveredColor}
            opacity={opacity}
          />
          <PlaneSlider
            dir1={xDir}
            dir2={yDir}
            onDragStart={onDragStart_}
            onDrag={onDrag_}
            onDragEnd={onDragEnd_}
            length={sliderLength}
            width={sliderWidth}
            color={axisColors[2]}
            hoveredColor={hoveredColor}
            opacity={opacity}
          />
          <PlaneSlider
            dir1={zDir}
            dir2={xDir}
            onDragStart={onDragStart_}
            onDrag={onDrag_}
            onDragEnd={onDragEnd_}
            length={sliderLength}
            width={sliderWidth}
            color={axisColors[1]}
            hoveredColor={hoveredColor}
            opacity={opacity}
          />
          <PlaneSlider
            dir1={yDir}
            dir2={zDir}
            onDragStart={onDragStart_}
            onDrag={onDrag_}
            onDragEnd={onDragEnd_}
            length={sliderLength}
            width={sliderWidth}
            color={axisColors[0]}
            hoveredColor={hoveredColor}
            opacity={opacity}
          />
          <AxisRotator
            dir1={xDir}
            dir2={yDir}
            onDragStart={onDragStart_}
            onDrag={onDrag_}
            onDragEnd={onDragEnd_}
            radius={rotatorRadius}
            width={rotatorWidth}
            color={axisColors[2]}
            hoveredColor={hoveredColor}
            opacity={opacity}
          />
          <AxisRotator
            dir1={zDir}
            dir2={xDir}
            onDragStart={onDragStart_}
            onDrag={onDrag_}
            onDragEnd={onDragEnd_}
            radius={rotatorRadius}
            width={rotatorWidth}
            color={axisColors[1]}
            hoveredColor={hoveredColor}
            opacity={opacity}
          />
          <AxisRotator
            dir1={yDir}
            dir2={zDir}
            onDragStart={onDragStart_}
            onDrag={onDrag_}
            onDragEnd={onDragEnd_}
            radius={rotatorRadius}
            width={rotatorWidth}
            color={axisColors[0]}
            hoveredColor={hoveredColor}
            opacity={opacity}
          />
        </group>
        <group ref={childrenRef}>{children}</group>
      </group>
    </group>
  )
}
