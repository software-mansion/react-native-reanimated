import { color } from './stringFormatUtils';
import type { NullableTestValue, TestCase } from './types';

export function nullableMatch(currentValue: NullableTestValue, testCase: TestCase, negation: boolean = false) {
  const pass = currentValue === null || currentValue === undefined;

  const coloredExpected = color('nullable', 'green');
  const coloredReceived = color(currentValue, 'red');
  const message = `Expected${negation ? ' NOT' : ''} ${coloredExpected} received ${coloredReceived}`;

  if ((!pass && !negation) || (pass && negation)) {
    testCase.errors.push(message);
  }
}
