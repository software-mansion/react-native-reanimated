import React, { useEffect, useState } from 'react';
import Example from './Example';

import { Range, SelectOption, formatReduceMotion } from '..';

import { ReduceMotion } from 'react-native-reanimated';
import useScreenSize from '@site/src/hooks/useScreenSize';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

const initialState = {
  x: 0,
  y: 0,
  z: 0,
};

export default function useAnimatedSensorPlayground() {
  const { windowWidth } =
    ExecutionEnvironment.canUseViewport && useScreenSize();
  const isMobile = windowWidth < 768;

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);
  // const [reduceMotion, setReduceMotion] = useState(initialState.reduceMotion);

  const resetOptions = () => {
    setX(initialState.x);
    setY(initialState.y);
    setZ(initialState.z);
    // setReduceMotion(initialState.reduceMotion);
  };

  const code = `
    x: ${x},
    y: ${y},
    z: ${z},
  `;

  const controls = (
    <>
      <Range
        label="X"
        min={0}
        max={2 * Math.PI}
        step={0.01}
        value={x}
        onChange={setX}
      />
      <Range
        label="Y"
        min={0}
        max={2 * Math.PI}
        step={0.01}
        value={y}
        onChange={setY}
      />
      <Range
        label="Z"
        min={0}
        max={2 * Math.PI}
        step={0.01}
        value={z}
        onChange={setZ}
      />
    </>
  );

  const example = (
    <Example
      options={{
        x,
        y,
        z,
        // reduceMotion,
      }}
    />
  );

  return {
    code,
    controls,
    example,
    resetOptions,
  };
}
