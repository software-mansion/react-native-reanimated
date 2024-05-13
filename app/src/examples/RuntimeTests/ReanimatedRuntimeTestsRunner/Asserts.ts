import { RUNTIME_TEST_ERRORS } from './stringFormatUtils';
import { TestCase, TestSuite } from './types';

export function assertMockedAnimationTimestamp(timestamp: number | undefined): asserts timestamp is number {
  'worklet';
  if (timestamp === undefined) {
    throw new Error(RUNTIME_TEST_ERRORS.NO_MOCKED_TIMESTAMP);
  }
}

export function assertTestSuite(test: TestSuite | null): asserts test is TestSuite {
  if (!test) {
    throw new Error(RUNTIME_TEST_ERRORS.UNDEFINED_TEST_SUITE);
  }
}

export function assertTestCase(test: TestCase | null): asserts test is TestCase {
  if (!test) {
    throw new Error(RUNTIME_TEST_ERRORS.UNDEFINED_TEST_CASE);
  }
}
