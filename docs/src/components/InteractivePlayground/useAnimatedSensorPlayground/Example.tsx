import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

interface Props {
  options: any;
}

function Phone(props) {
  const { x, y, z } = props;
  const meshRef = useRef();

  useEffect(() => {
    meshRef.current.rotation.x = x;
    meshRef.current.rotation.y = y;
    meshRef.current.rotation.z = z;
  }, [x, y, z]);

  return (
    <mesh position={[0, 0, 2.5]} ref={meshRef}>
      <boxGeometry args={[1, 2, 0.1]} />
      <meshStandardMaterial color={'#782aeb'} />
    </mesh>
  );
}

export default function App({ options }: Props) {
  return (
    <Canvas style={{ height: 300 }}>
      <ambientLight intensity={10} />

      <pointLight position={[1, 1, 1]} intensity={5} />
      <Phone {...options} />
    </Canvas>
  );
}
