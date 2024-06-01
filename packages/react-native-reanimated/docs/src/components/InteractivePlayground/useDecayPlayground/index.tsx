import React, { useState } from 'react';
import Example from './Example';

import {
  Range,
  CheckboxOption,
  SelectOption,
  formatReduceMotion,
  DoubleRange,
} from '..';
import { ReduceMotion, WithDecayConfig } from 'react-native-reanimated';

const defaultConfig: Omit<WithDecayConfig, 'rubberBandFactor'> & {
  rubberBandFactor: number;
} = {
  deceleration: 0.998,
  clamp: [-300, 300],
  velocityFactor: 1,
  rubberBandEffect: true,
  rubberBandFactor: 0.6,
  reduceMotion: ReduceMotion.System,
};

export default function useDecayPlayground() {
  const [deceleration, setDeceleration] = useState(defaultConfig.deceleration);
  const [clampMin, setClampMin] = useState(defaultConfig.clamp[0]);
  const [clampMax, setClampMax] = useState(defaultConfig.clamp[1]);
  const [velocityFactor, setVelocityFactor] = useState(
    defaultConfig.velocityFactor
  );
  const [rubberBandEffect, setRubberBandEffect] = useState(
    defaultConfig.rubberBandEffect
  );
  const [rubberBandFactor, setRubberBandFactor] = useState(
    defaultConfig.rubberBandFactor
  );
  const [reduceMotion, setReduceMotion] = useState(defaultConfig.reduceMotion);

  const resetOptions = () => {
    setDeceleration(() => defaultConfig.deceleration);
    setClampMin(() => defaultConfig.clamp[0]);
    setClampMax(() => defaultConfig.clamp[1]);
    setVelocityFactor(() => defaultConfig.velocityFactor);
    setRubberBandEffect(() => defaultConfig.rubberBandEffect);
    setReduceMotion(() => defaultConfig.reduceMotion);
  };

  const code = `
    withDecay({
      velocity: event.velocityX,
      deceleration: ${deceleration},
      clamp: [${clampMin}, ${clampMax}],
      velocityFactor: ${velocityFactor},
      rubberBandEffect: ${rubberBandEffect},
      ${rubberBandEffect ? '' : '// '}rubberBandFactor: ${rubberBandFactor},
      reduceMotion: ${formatReduceMotion(reduceMotion)},
    })
  `;

  const controls = (
    <>
      {/* Needed state-controlled Tabs and `TabItem` components from "@theme/Tabs" so I hacked them around with classes ;) */}
      <Range
        label="Deceleration"
        min={0.9}
        max={1}
        step={0.001}
        value={deceleration}
        onChange={setDeceleration}
      />
      <DoubleRange
        label="Clamp limits"
        min={defaultConfig.clamp[0]}
        max={defaultConfig.clamp[1]}
        step={1}
        value={[clampMin, clampMax]}
        onChange={[setClampMin, setClampMax]}
      />
      <Range
        label="Velocity factor"
        min={0.1}
        max={2}
        step={0.1}
        value={velocityFactor}
        onChange={setVelocityFactor}
      />
      <CheckboxOption
        label="Rubber band effect"
        value={rubberBandEffect}
        onChange={setRubberBandEffect}
      />
      <Range
        label="Rubber band factor"
        min={0.1}
        max={1}
        step={0.1}
        value={rubberBandFactor}
        onChange={setRubberBandFactor}
      />
      <SelectOption
        label="Reduce motion"
        value={reduceMotion}
        onChange={(option) => setReduceMotion(option as ReduceMotion)}
        options={[ReduceMotion.System, ReduceMotion.Always, ReduceMotion.Never]}
      />
    </>
  );

  return {
    example: Example,
    props: {
      options: {
        deceleration,
        clamp: [clampMin, clampMax],
        velocityFactor,
        rubberBandEffect,
        rubberBandFactor,
        reduceMotion,
      },
    },
    controls,
    code,
    resetOptions,
    additionalComponents: {},
  };
}
