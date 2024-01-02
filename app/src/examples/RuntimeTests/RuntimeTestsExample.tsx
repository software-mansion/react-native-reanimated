import React from 'react';
import RuntimeTestsRunner from './ReanimatedRuntimeTestsRunner/RuntimeTestsRunner';

// load tests
// import './tests/Animations.test';
// import './tests/sharedValue.test';
import './tests/withTiming.runtest';

export default function RuntimeTestsExample() {
  return <RuntimeTestsRunner />;
}
