import React from 'react';
import RuntimeTestsRunner from './ReanimatedRuntimeTestsRunner/RuntimeTestsRunner';

// load tests
import './tests/Animations.test';

import './tests/animations/withTiming/easing.test';
import './tests/animations/withTiming/basic.test';
import './tests/animations/withTiming/colors.test';
import './tests/animations/withTiming/arrays.test';
import './tests/animations/withTiming/transformMatrices.test';

import './tests/layoutAnimations/entering/enteringColors.test';

import './tests/layoutAnimations/entering/predefinedEntering.test';

import './tests/utilities/relativeCoords.test';

export default function RuntimeTestsExample() {
  return <RuntimeTestsRunner />;
}
