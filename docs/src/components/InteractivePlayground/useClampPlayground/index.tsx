import React, { useState } from 'react';
import { DoubleRange } from '..';
import Example from './Example';

const initialState = {
  lowerBound: 100,
  upperBound: 300,
  lowerSpringToValue: 150,
  upperSpringToValue: 190,
};

export default function useClampPlayground() {
  const [lowerBound, setLowerBound] = useState(initialState.lowerBound);
  const [upperBound, setUpperBound] = useState(initialState.upperBound);

  const [lowerSpringToValue, setLowerSpringToValue] = useState(
    initialState.lowerSpringToValue
  );
  const [upperSpringToValue, setUpperSpringToValue] = useState(
    initialState.upperBound
  );

  const example = (
    <Example
      options={{
        lowerBound: lowerBound,
        upperBound: upperBound,
        lowerSpringToValue,
        upperSpringToValue,
      }}
    />
  );

  const controls = (
    <>
      <DoubleRange
        label="Clamp limits"
        min={0}
        max={400}
        step={10}
        value={[lowerBound, upperBound]}
        onChange={[setLowerBound, setUpperBound]}
      />
      <DoubleRange
        label="Final spring value"
        min={0}
        max={400}
        step={10}
        value={[lowerSpringToValue, upperSpringToValue]}
        onChange={[setLowerSpringToValue, setUpperSpringToValue]}
      />
    </>
  );

  const resetOptions = () => {
    setLowerBound(initialState.lowerBound);
    setUpperBound(initialState.upperBound);
    setLowerSpringToValue(initialState.lowerSpringToValue);
    setUpperSpringToValue(initialState.upperSpringToValue);
  };

  const code = `{
  width: withClamp(
    { min: ${lowerBound}, max: ${upperBound} },
    withSpring(width.value)
  ),
}
`;

  return {
    code,
    controls,
    example,
    resetOptions,
  };
}
