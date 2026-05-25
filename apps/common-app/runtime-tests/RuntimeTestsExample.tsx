import React from 'react';

import RuntimeTestsRunner from './ReJest/RuntimeTestsRunner';
import { RUNTIME_TEST_SUITES } from './suites';

export default function RuntimeTestsExample() {
  return <RuntimeTestsRunner tests={RUNTIME_TEST_SUITES} />;
}
