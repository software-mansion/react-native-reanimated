import React, { useEffect, useState } from 'react';
import Example from './Example';

import { Range, SelectOption, formatReduceMotion } from '..';

import { ReduceMotion } from 'react-native-reanimated';
import useScreenSize from '@site/src/hooks/useScreenSize';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import { SensorType } from 'react-native-reanimated';
import * as THREE from 'three';

const g_0 = 9.80665;

const initialState = {
  x: 180,
  y: 180,
  z: 180,
  sensorType: 'GRAVITY',
};

export default function useAnimatedSensorPlayground() {
  const { windowWidth } =
    ExecutionEnvironment.canUseViewport && useScreenSize();
  const isMobile = windowWidth < 768;

  const [x, setX] = useState(initialState.x);
  const [y, setY] = useState(initialState.y);
  const [z, setZ] = useState(initialState.z);
  const [sensorType, setSensorType] = useState(initialState.sensorType);

  const resetOptions = () => {
    setX(initialState.x);
    setY(initialState.y);
    setZ(initialState.z);
    setSensorType(initialState.sensorType);
  };

  const angleX = THREE.MathUtils.degToRad(x);
  const angleY = THREE.MathUtils.degToRad(y);
  const angleZ = THREE.MathUtils.degToRad(z);

  var euler = new THREE.Euler(angleX, angleY, angleZ, 'XYZ');

  var rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(euler);

  var vector = new THREE.Vector3(0, -g_0, 0);
  const rotationVector = vector.applyMatrix4(rotationMatrix);

  const gravityCode = `
  { 
    "interfaceOrientation": 0,
    "x": ${rotationVector.x.toFixed(2)},
    "y": ${rotationVector.y.toFixed(2)},
    "z": ${rotationVector.z.toFixed(2)}
  }
  `;

  const controls = (
    <>
      <SelectOption
        label="Sensor type"
        value={sensorType}
        onChange={(option) => setSensorType(option)}
        options={[
          'ACCELEROMETER',
          'GYROSCOPE',
          'GRAVITY',
          'MAGNETIC_FIELD',
          'ROTATION',
        ]}
      />
      <Range label="X" min={0} max={359} step={1} value={x} onChange={setX} />
      <Range label="Y" min={0} max={359} step={1} value={y} onChange={setY} />
      <Range label="Z" min={0} max={359} step={1} value={z} onChange={setZ} />
    </>
  );

  const example = (
    <Example
      options={{
        x,
        y,
        z,
      }}
    />
  );

  return {
    code: gravityCode,
    controls,
    example,
    resetOptions,
  };
}
