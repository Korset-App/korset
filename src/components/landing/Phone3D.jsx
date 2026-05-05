import React, { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, PresentationControls, useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'

// iPhone Model Component
function Model({ ...props }) {
  // HOOKS MUST BE AT THE TOP LEVEL
  const { nodes, materials } = useGLTF(
    'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/iphone-x/model.gltf'
  )
  const group = useRef()

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.getElapsedTime()
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      Math.cos(t / 2) / 20,
      0.1
    )
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      Math.sin(t / 4) / 20,
      0.1
    )
    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      (1 + Math.sin(t / 1.5)) / 10,
      0.1
    )
  })

  // Safe checks AFTER hooks
  if (!nodes || !materials) return null

  return (
    <group ref={group} {...props} dispose={null}>
      {nodes.body && <mesh geometry={nodes.body.geometry} material={materials.body} />}
      {nodes.screen && (
        <mesh geometry={nodes.screen.geometry}>
          <meshStandardMaterial roughness={0.1} metalness={0.8} color="#050505" />
          <Html
            transform
            occlude
            position={[0, 0, 0.06]}
            style={{
              width: '185px',
              height: '400px',
              background: '#02090a',
              overflow: 'hidden',
              borderRadius: '24px',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '24px',
              fontWeight: '700',
              fontFamily: 'sans-serif',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px', fontWeight: 400 }}>
                KÖRSET PWA
              </div>
              KÖRSET
            </div>
          </Html>
        </mesh>
      )}
      {nodes.button && <mesh geometry={nodes.button.geometry} material={materials.body} />}
    </group>
  )
}

export default function Phone3D() {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
        }}
      >
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />

        <Suspense fallback={null}>
          <PresentationControls
            global
            config={{ mass: 2, tension: 500 }}
            snap={{ mass: 4, tension: 1500 }}
            rotation={[0, 0.3, 0]}
            polar={[-Math.PI / 4, Math.PI / 4]}
            azimuth={[-Math.PI / 4, Math.PI / 4]}
          >
            <Float rotationIntensity={1.5} floatIntensity={2}>
              <Model scale={1.8} position={[0, -0.5, 0]} />
            </Float>
          </PresentationControls>
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  )
}
