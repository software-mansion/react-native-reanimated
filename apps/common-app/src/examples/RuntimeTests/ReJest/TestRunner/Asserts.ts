import type { TestCase, TestSuite } from '../types';
import type { TestSuiteExecutionManager } from './TestSuiteManager';

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

export function assertExecutionManager(
  testManager: TestSuiteExecutionManager | null,
): asserts testManager is TestSuiteExecutionManager {
  if (!testManager) {
    throw new Error(
      'Undefined test execution Test Manager, you probably wanted to execute one of the functions that must be run only after starting tests (expect, useTestRef, etc.)',
    );
  }
}
