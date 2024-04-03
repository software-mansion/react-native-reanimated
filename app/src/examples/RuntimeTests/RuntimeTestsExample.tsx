import React from 'react';
import RuntimeTestsRunner from './ReanimatedRuntimeTestsRunner/RuntimeTestsRunner';

// load tests
// import './tests/Animations.test';
import './tests/animations/withTiming/easingSnapshots.test';
import './tests/animations/withTiming/basicTests.test';
import './tests/animations/withTiming/colors.test';

export default function RuntimeTestsExample() {
  return <RuntimeTestsRunner />;
}
