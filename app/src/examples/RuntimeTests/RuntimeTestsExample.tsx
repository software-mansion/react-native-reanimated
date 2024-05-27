import React from 'react';
import RuntimeTestsRunner from './ReanimatedRuntimeTestsRunner/RuntimeTestsRunner';

// load tests
import './tests/Animations.test';

import './tests/animations';

import './tests/animations/withSpring/variousConfig.test';

import './tests/layoutAnimations/entering/enteringColors.test';
import './tests/layoutAnimations/entering/predefinedEntering.test';

import './tests/utilities/relativeCoords.test';

import './tests/core/useSharedValue.test';
import './tests/core/useAnimatedStyle/reuseAnimatedStyle.test';
import './tests/core/useDerivedValue/basic.test';
import './tests/core/useDerivedValue/chain.test';

export default function RuntimeTestsExample() {
  return <RuntimeTestsRunner />;
}
