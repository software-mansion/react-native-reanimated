import React from 'react';
import Example from './Example';


export default function useClampPlayground() {
  const example = (
    <Example options={{lowerBound: 100, upperBound:220, lowerSpringToValue:150, upperSprintToValue: 200}}/>
  )

  return {
    // code,
    // controls,
    example,
    // resetOptions,
    // additionalComponents: { chart },
  };
}
