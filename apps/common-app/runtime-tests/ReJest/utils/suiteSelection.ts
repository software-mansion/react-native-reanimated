import type { RuntimeTestSuite } from '../../types';
import type { DeclaredSuite } from './remoteProtocol';

export function declareSuites(tests: RuntimeTestSuite[]): DeclaredSuite[] {
  return tests.map((test) => ({
    name: test.testSuiteName,
    skipByDefault: !!test.skipByDefault,
    fullRunOnly: !!test.fullRunOnly,
    disabled: !!test.disabled,
  }));
}

export function selectSuitesToRun(
  tests: RuntimeTestSuite[],
  only: string[] | undefined,
  full: boolean | undefined
): RuntimeTestSuite[] {
  const filterSet = only ? new Set(only) : null;
  const known = new Set(tests.map((test) => test.testSuiteName));
  const unknown = [...(filterSet ?? [])].filter((name) => !known.has(name));
  if (unknown.length > 0) {
    throw new Error(`Unknown test suites: ${unknown.join(', ')}`);
  }

  return tests.filter((test) => {
    if (test.disabled) {
      return false;
    }
    if (filterSet) {
      return filterSet.has(test.testSuiteName);
    }
    return !test.skipByDefault && (!!full || !test.fullRunOnly);
  });
}
