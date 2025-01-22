import type { TestCase, TestSuite } from '../types';

export function assertMockedAnimationTimestamp(timestamp: number | undefined): asserts timestamp is number {
  'worklet';
  if (timestamp === undefined) {
    throw new Error("Seems that you've forgot to call `mockAnimationTimer()`");
  }
}

export function assertTestSuite(test: TestSuite | null): asserts test is TestSuite {
  if (!test) {
    throw new Error('Undefined test suite context');
  }
}

export function assertTestCase(test: TestCase | null): asserts test is TestCase {
  if (!test) {
    throw new Error('Undefined test case context');
  }
}
