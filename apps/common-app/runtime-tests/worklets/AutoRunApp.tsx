import React from 'react';

import AutoRunRuntimeTestsApp from '../AutoRunRuntimeTestsApp';
import { WORKLETS_TEST_SUITES } from './suites';

export default function WorkletsAutoRunApp() {
  return (
    <AutoRunRuntimeTestsApp
      tests={WORKLETS_TEST_SUITES}
      library="Worklets"
      forbidReanimated
    />
  );
}
