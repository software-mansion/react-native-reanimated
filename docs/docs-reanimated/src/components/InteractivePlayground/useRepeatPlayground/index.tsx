import React, { useState } from 'react';
import Example from './Example';

import { Range, CheckboxOption, SelectOption, formatReduceMotion } from '..';
import { ReduceMotion } from 'react-native-reanimated';

const defaultConfig = {
  numberOfReps: 2,
  reverse: false,
  reduceMotion: ReduceMotion.System,
};

const TIMING_OFFSET = 200;

export default function useRepeatPlayground() {
  const [infinity, setInfinity] = useState(false);
  const [numberOfReps, setNumberOfReps] = useState(defaultConfig.numberOfReps);
  const [reverse, setReverse] = useState(defaultConfig.reverse);
  const [reduceMotion, setReduceMotion] = useState(defaultConfig.reduceMotion);

  const resetOptions = () => {
    setNumberOfReps(() => defaultConfig.numberOfReps);
    setReverse(() => defaultConfig.reverse);
    setReduceMotion(() => defaultConfig.reduceMotion);
  };

  const code = `
    withRepeat(
      withTiming(${TIMING_OFFSET}, { duration: 1000 }),
      ${infinity ? -1 : numberOfReps},
      ${reverse},
      () => {},
      ${formatReduceMotion(reduceMotion)},
    )
  `;

  const controls = (
    <>
      <CheckboxOption
        label="Infinity"
        value={infinity}
        onChange={setInfinity}
      />
      <Range
        label="Repetitions"
        min={1}
        max={10}
        step={1}
        disabled={infinity}
        value={numberOfReps}
        onChange={setNumberOfReps}
      />
      <CheckboxOption label="Reverse" value={reverse} onChange={setReverse} />
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
        numberOfReps: infinity ? -1 : numberOfReps,
        reverse,
        reduceMotion,
      },
    },
    controls,
    code,
    resetOptions,
    additionalComponents: {},
  };
}
