import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import useBaseUrl from '@docusaurus/useBaseUrl';

interface Props {
  options: any;
}

function Phone(props) {
  const { x, y, z } = props;
  const meshRef = useRef();
  const colorMap = useLoader(
    TextureLoader,
    useBaseUrl('img/reanimated-texture.png')
  );

  useEffect(() => {
    meshRef.current.rotation.x = x;
    meshRef.current.rotation.y = y;
    meshRef.current.rotation.z = z;
  }, [x, y, z]);

  return (
    <mesh position={[0, 0, 2.5]} ref={meshRef}>
      <boxGeometry args={[1, 2, 0.1]} />
      <meshStandardMaterial attachArray="material" color={'#001a72'} />
      <meshStandardMaterial attachArray="material" color={'#001a72'} />
      <meshStandardMaterial attachArray="material" color={'#001a72'} />
      <meshStandardMaterial attachArray="material" color={'#001a72'} />
      <meshStandardMaterial attachArray="material" color={'#001a72'} />
      <meshStandardMaterial attachArray="material" map={colorMap} />
      <meshStandardMaterial attachArray="material" color={'#001a72'} />
    </mesh>
  );
}

export default function App({ options }: Props) {
  return (
    <Canvas style={{ height: 300 }}>
      <React.Suspense fallback={null}>
        <ambientLight intensity={50} />
        <spotLight
          position={[1, 1, 1]}
          angle={0.15}
          penumbra={1}
          decay={0}
          intensity={50}
        />
        <pointLight position={[-1, -1, -1]} decay={0} intensity={50} />
        <Phone {...options} />
      </React.Suspense>
    </Canvas>
  );
}
