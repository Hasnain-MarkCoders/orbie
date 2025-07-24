import React, { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Import shader code
import vertexPars from './shaders/vertex_pars.glsl'
import vertexMain from './shaders/vertex_main.glsl'
import fragmentPars from './shaders/fragment_pars.glsl'
import fragmentMain from './shaders/fragment_main.glsl'

// Custom shader material component
function CustomShaderMaterial({HMamp}) {
  const materialRef = useRef()
  const shaderRef = useRef()

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime() / 5
    }
  })

  // Update HMamp uniform when prop changes
  React.useEffect(() => {
    if (shaderRef.current && shaderRef.current.uniforms.HMamp) {
      shaderRef.current.uniforms.HMamp.value = HMamp
    }
  }, [HMamp])

  const material = useMemo(() => {
    console.log(HMamp)
    return new THREE.MeshStandardMaterial({
      onBeforeCompile: (shader) => {
        // Store reference to shader object
        shaderRef.current = shader

        // Add uniforms
        shader.uniforms.uTime = { value: 0 }
        shader.uniforms.HMamp = { value: HMamp }

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

  return <primitive object={material} ref={materialRef} />
}

// Scene component
function Scene({HMamp, setHMamp, targetHMamp, setTargetHMamp, isTransitioning, setIsTransitioning}) {
  const transitionStartRef = useRef(null)
  const startValueRef = useRef(null)
  const lastTargetRef = useRef(null)

  // Smooth transition animation
  useFrame(({ clock }) => {
    if (isTransitioning) {
      const currentTime = clock.getElapsedTime()
      
      // Check if target has changed (new button press during transition)
      if (lastTargetRef.current !== targetHMamp) {
        // Reset transition with new target
        transitionStartRef.current = currentTime
        startValueRef.current = HMamp
        lastTargetRef.current = targetHMamp
      }
      
      // Initialize transition start time and start value if not set
      if (transitionStartRef.current === null) {
        transitionStartRef.current = currentTime
        startValueRef.current = HMamp
        lastTargetRef.current = targetHMamp
      }
      
      const transitionDuration = 5.0 // 5 second transition
      const elapsed = currentTime - transitionStartRef.current
      const progress = Math.min(elapsed / transitionDuration, 1)
      
      // Easing function for smooth transition
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      
      const newValue = startValueRef.current + (targetHMamp - startValueRef.current) * easeOutCubic
      setHMamp(newValue)
      
      if (progress >= 1) {
        setIsTransitioning(false)
        setHMamp(targetHMamp)
        transitionStartRef.current = null
        startValueRef.current = null
        lastTargetRef.current = null
      }
    }
  })

  return (
    <>
      {/* Lighting */}
      <directionalLight position={[2, 2, 2]} color="#526cff" intensity={0.6} />
      <ambientLight color="#4255ff" intensity={0.5} />

      {/* Main mesh with custom shader */}
      <mesh>
        <icosahedronGeometry args={[1, 400]} />
        <CustomShaderMaterial HMamp={HMamp} />
      </mesh>

      {/* Controls */}
      <OrbitControls enableDamping />
    </>
  )
}

// Main App component
function App() {
  const [HMamp, setHMamp] = useState(4)
  const [targetHMamp, setTargetHMamp] = useState(4)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const lastClickTimeRef = useRef(0)
  
  // Wave limits for oscillating effect
  const MIN_AMPLITUDE = 2
  const MAX_AMPLITUDE = 5
  const [isIncreasing, setIsIncreasing] = useState(true)
  
  // Microphone permission state
  const [micPermission, setMicPermission] = useState('prompt')
  const [micStream, setMicStream] = useState(null)

  // Request microphone permission on app load
  React.useEffect(() => {
    const requestMicPermission = async () => {
      console.log('Checking microphone support...')
      console.log('navigator.mediaDevices:', navigator.mediaDevices)
      console.log('window.isSecureContext:', window.isSecureContext)
      console.log('Current URL:', window.location.href)
      
      // Check if MediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('MediaDevices API not supported')
        setMicPermission('unsupported')
        return
      }

      // Check if running in secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        console.warn('Microphone access requires HTTPS or localhost')
        setMicPermission('insecure')
        return
      }

      try {
        console.log('Requesting microphone permission...')
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true,
          video: false 
        })
        setMicStream(stream)
        setMicPermission('granted')
        console.log('Microphone permission granted')
      } catch (error) {
        console.error('Microphone permission denied:', error)
        setMicPermission('denied')
      }
    }

    requestMicPermission()
  }, [])

  const requestMicPermission = async () => {
    try {
      console.log('Requesting microphone permission...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicStream(stream)
      setMicPermission('granted')
      console.log('Microphone permission granted')
    } catch (error) {
      console.error('Microphone permission denied:', error)
      setMicPermission('denied')
    }
  }

  const handleClick = () => {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTimeRef.current
    
    // Prevent rapid successive clicks (debounce)
    if (timeSinceLastClick < 100) {
      return
    }
    
    lastClickTimeRef.current = now
    
    // Oscillate between min and max values
    let newTarget
    if (isIncreasing) {
      newTarget = Math.min(targetHMamp + 1, MAX_AMPLITUDE)
      if (newTarget === MAX_AMPLITUDE) {
        setIsIncreasing(false)
      }
    } else {
      newTarget = Math.max(targetHMamp - 1, MIN_AMPLITUDE)
      if (newTarget === MIN_AMPLITUDE) {
        setIsIncreasing(true)
      }
    }
    
    setTargetHMamp(newTarget)
    setIsTransitioning(true)
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '20px', 
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <button onClick={handleClick}>
          {isIncreasing ? 'Increase' : 'Decrease'} Amplitude ({targetHMamp})
        </button>
        
        <div style={{ 
          padding: '8px 12px', 
          borderRadius: '6px', 
          fontSize: '14px',
          fontWeight: '500',
          backgroundColor: micPermission === 'granted' ? '#10b981' : 
                          micPermission === 'denied' ? '#ef4444' : '#f59e0b',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>🎤 Mic: {micPermission === 'granted' ? 'Connected' : 
                   micPermission === 'denied' ? 'Denied' : 'Requesting...'}</span>
          {micPermission !== 'granted' && (
            <button 
              onClick={requestMicPermission}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          )}
        </div>
      </div>

      <Canvas
        camera={{ position: [0, 0, 2], fov: 75 }}
        gl={{ antialias: true }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={[0x090a0b]} />
        
        <Scene 
          HMamp={HMamp} 
          setHMamp={setHMamp}
          targetHMamp={targetHMamp}
          setTargetHMamp={setTargetHMamp}
          isTransitioning={isTransitioning}
          setIsTransitioning={setIsTransitioning}
        />
      </Canvas>
    </div>
  )
}

export default App 