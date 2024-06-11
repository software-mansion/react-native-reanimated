import React, { useState } from 'react';
import { DoubleRange } from '..';
import Example from './Example';

const initialState = {
  lowerBound: 100,
  upperBound: 300,
};

export default function useClampPlayground() {
  const [lowerBound, setLowerBound] = useState(initialState.lowerBound);
  const [upperBound, setUpperBound] = useState(initialState.upperBound);

  const controls = (
    <DoubleRange
      label="Clamp limits"
      min={0}
      max={400}
      step={10}
      value={[lowerBound, upperBound]}
      onChange={[setLowerBound, setUpperBound]}
    />
  );

  const resetOptions = () => {
    setLowerBound(initialState.lowerBound);
    setUpperBound(initialState.upperBound);
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
    example: Example,
    props: {
      options: {
        lowerBound: lowerBound,
        upperBound: upperBound,
      },
    },
    resetOptions,
  };
}
