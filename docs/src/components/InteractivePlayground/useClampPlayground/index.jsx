import React from 'react';
import Example from './Example';


export default function useClampPlayground() {
  const example = (
    <Example />
  )

  return {
    // code,
    // controls,
    example,
    // resetOptions,
    // additionalComponents: { chart },
  };
}
