import React from 'react';
import RuntimeTestsRunner from './ReanimatedRuntimeTestsRunner/RuntimeTestsRunner';

// load tests
// import './tests/Animations.test';
import './tests/animations/withTiming/easingSnapshots.test';
import './tests/animations/withTiming/basic.test';
import './tests/animations/withTiming/colors.test';
import './tests/animations/withTiming/arrays.test';

export default function RuntimeTestsExample() {
  return <RuntimeTestsRunner />;
}
