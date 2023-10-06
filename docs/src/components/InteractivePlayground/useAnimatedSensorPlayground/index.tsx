import React, { useEffect, useState } from 'react';
import Example from './Example';

import { Range, SelectOption, formatReduceMotion } from '..';

import { ReduceMotion } from 'react-native-reanimated';
import useScreenSize from '@site/src/hooks/useScreenSize';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import { SensorType, ValueRotation } from 'react-native-reanimated';
import * as THREE from 'three';

const g_0 = 9.80665;

const initialState = {
  x: 0,
  y: 0,
  z: 0,
  sensorType: 'GRAVITY',
};

function degreeToRadian(x: number, y: number, z: number) {
  const radX = THREE.MathUtils.degToRad(x);
  const radY = THREE.MathUtils.degToRad(y);
  const radZ = THREE.MathUtils.degToRad(z);
  return { radX, radY, radZ };
}

function getGravityRotationVector(x: number, y: number, z: number) {
  const { radX, radY, radZ } = degreeToRadian(x, y, z);

  const euler = new THREE.Euler(radX, radY, radZ, 'XYZ');
  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(euler);
  const gravityVector = new THREE.Vector3(0, -g_0, 0);

  const rotationVector = gravityVector.applyMatrix4(rotationMatrix);

  return rotationVector;
}

function formatGravityCode(rotationVector: THREE.Vector3) {
  return `
  { 
    "interfaceOrientation": 0,
    "x": ${rotationVector.x.toFixed(2)},
    "y": ${rotationVector.y.toFixed(2)},
    "z": ${rotationVector.z.toFixed(2)}
  }
  `;
}

function getRotation(
  x: number,
  y: number,
  z: number
): Omit<ValueRotation, 'interfaceOrientation'> {
  const { radX, radY, radZ } = degreeToRadian(x, y, z);
  const euler = new THREE.Euler(radX, radY, radZ, 'XYZ');
  const quaternion = new THREE.Quaternion();
  quaternion.setFromEuler(euler);

  return {
    pitch: euler.x,
    roll: euler.y,
    yaw: euler.z,
    qw: quaternion.w,
    qx: quaternion.x,
    qy: quaternion.y,
    qz: quaternion.z,
  };
}

function formatRotationCode({
  pitch,
  roll,
  yaw,
  qw,
  qx,
  qy,
  qz,
}: Omit<ValueRotation, 'interfaceOrientation'>) {
  return `
  { 
    "interfaceOrientation": 0,
    "pitch": ${(-pitch).toFixed(2)},
    "roll": ${roll.toFixed(2)},
    "yaw": ${yaw.toFixed(2)},

    "qw": ${qw.toFixed(2)},
    "qx": ${qx.toFixed(2)},
    "qy": ${qy.toFixed(2)},
    "qz": ${qz.toFixed(2)}
  }
  `;
}

function getGyroscope(x: number, y: number, z: number, dt: number) {
  const { radX, radY, radZ } = degreeToRadian(x, y, z);

  console.log(radY / dt);
}

export default function useAnimatedSensorPlayground() {
  const [x, setX] = useState(initialState.x);
  const [y, setY] = useState(initialState.y);
  const [z, setZ] = useState(initialState.z);
  const [sensorType, setSensorType] = useState(initialState.sensorType);

  const resetOptions = () => {
    setX(initialState.x);
    setY(initialState.y);
    setZ(initialState.z);
  };

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
      <Range
        label="X"
        min={-180}
        max={180}
        step={1}
        value={x}
        onChange={setX}
      />
      <Range
        label="Y"
        min={-180}
        max={180}
        step={1}
        value={y}
        onChange={setY}
      />
      <Range
        label="Z"
        min={-180}
        max={180}
        step={1}
        value={z}
        onChange={setZ}
      />
    </>
  );

  const example = <Example options={{ x, y, z }} />;

  const gravityCode = formatGravityCode(getGravityRotationVector(x, y, z));
  const rotationCode = formatRotationCode(getRotation(x, y, z));

  const formatCode = (sensorType: string) => {
    if (sensorType === 'GRAVITY') {
      return gravityCode;
    }
    if (sensorType === 'ROTATION') {
      return rotationCode;
    }
  };

  return {
    code: formatCode(sensorType),
    controls,
    example,
    resetOptions,
  };
}
