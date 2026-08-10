import type { RuntimeTestSuite } from '../types';

export const SELF_TEST_SUITES: RuntimeTestSuite[] = [
  {
    testSuiteName: 'self-tests',
    importTest: () => {
      require('./tests/TestsOfTestingFramework.test');
    },
  },
  {
    testSuiteName: 'intentional failures',
    skipByDefault: true,
    importTest: () => {
      require('./tests/IntentionalFailures.test');
    },
  },
];
