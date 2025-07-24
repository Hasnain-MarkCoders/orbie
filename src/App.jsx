import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Import shader code
import vertexPars from './shaders/vertex_pars.glsl'
import vertexMain from './shaders/vertex_main.glsl'
import fragmentPars from './shaders/fragment_pars.glsl'
import fragmentMain from './shaders/fragment_main.glsl'

// Scene component
function Scene() {
  const meshRef = useRef()
  const shaderRef = useRef()

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime() / 5
    }
  })

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      onBeforeCompile: (shader) => {
        // Store reference to shader object
        shaderRef.current = shader

        // Add uniforms
        shader.uniforms.uTime = { value: 0 }

        // Inject vertex shader code
        const parsVertexString = /* glsl */ `#include <displacementmap_pars_vertex>`
        shader.vertexShader = shader.vertexShader.replace(
          parsVertexString,
          parsVertexString + vertexPars
        )

        const mainVertexString = /* glsl */ `#include <displacementmap_vertex>`
        shader.vertexShader = shader.vertexShader.replace(
          mainVertexString,
          mainVertexString + vertexMain
        )

        // Inject fragment shader code
        const mainFragmentString = /* glsl */ `#include <normal_fragment_maps>`
        const parsFragmentString = /* glsl */ `#include <bumpmap_pars_fragment>`
        shader.fragmentShader = shader.fragmentShader.replace(
          parsFragmentString,
          parsFragmentString + fragmentPars
        )
        shader.fragmentShader = shader.fragmentShader.replace(
          mainFragmentString,
          mainFragmentString + fragmentMain
        )
      },
      color: '#526cff',
      metalness: 0.1,
      roughness: 0.2
    })
  }, [])

  return (
    <>
      {/* Lighting */}
      <directionalLight position={[2, 2, 2]} color="#526cff" intensity={0.6} />
      <ambientLight color="#4255ff" intensity={0.5} />

      {/* Main mesh with custom shader */}
      <mesh ref={meshRef} material={material}>
        <icosahedronGeometry args={[1, 400]} />
      </mesh>

      {/* Controls */}
      <OrbitControls enableDamping />
    </>
  )
}

// Main App component
function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{ position: [0, 0, 2], fov: 75 }}
        gl={{ antialias: true }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={[0x090a0b]} />
        
        <Scene />
      </Canvas>
    </div>
  )
}

export default App 