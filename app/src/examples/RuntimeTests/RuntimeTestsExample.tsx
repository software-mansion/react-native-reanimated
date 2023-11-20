import React from 'react';
import RuntimeTestsRunner from './ReanimatedRuntimeTestsRunner/RuntimeTestsRunner';

// load tests
import './tests/Animations.test';

export default function RuntimeTestsExample() {
  return (
    <RuntimeTestsRunner />
  );
}

