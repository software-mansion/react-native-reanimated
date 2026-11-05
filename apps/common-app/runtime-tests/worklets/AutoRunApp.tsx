import React from 'react';

import type { AutoRunRootProps } from '../AutoRunRuntimeTestsApp';
import AutoRunRuntimeTestsApp from '../AutoRunRuntimeTestsApp';
import { WORKLETS_TEST_SUITES } from './suites';

export default function WorkletsAutoRunApp({ wsUrl }: AutoRunRootProps) {
  return (
    <AutoRunRuntimeTestsApp
      tests={WORKLETS_TEST_SUITES}
      library="Worklets"
      forbidReanimated
      wsUrl={wsUrl}
    />
  );
}
