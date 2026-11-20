import type { RuntimeTestSuite } from '../types';

export const WORKLETS_HEADLESS_TEST_SUITES: RuntimeTestSuite[] = [
  {
    testSuiteName: 'headless cold start',
    importTest: () => {
      require('./tests/headless/coldStart.test');
    },
  },
];
