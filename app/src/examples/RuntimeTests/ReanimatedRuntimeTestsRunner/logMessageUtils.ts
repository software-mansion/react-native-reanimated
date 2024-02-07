import { ComparisonMode, TestValue } from './types';

export const RUNTIME_TEST_ERRORS = {
  UNDEFINED_TEST_SUITE: 'Undefined test suite context',
  UNDEFINED_TEST_CASE: 'Undefined test case context',
  NO_MOCKED_TIMESTAMP:
    "Seems that you've forgot to call `mockAnimationTimer()`",
};

export function logInFrame(text: string) {
  console.log(`\t╔${'═'.repeat(text.length + 2)}╗`);
  console.log(`\t║ ${text} ║`);
  console.log(`\t╚${'═'.repeat(text.length + 2)}╝`);
}

export function color(
  value: TestValue,
  color: 'yellow' | 'cyan' | 'green' | 'red'
) {
  const COLOR_CODES = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
  };

  return `${COLOR_CODES[color]}${value}\x1b[0m`;
}

export function defaultTestErrorLog(
  expected: TestValue,
  received: TestValue,
  mode: ComparisonMode
) {
  return `Expected ${color(expected, 'cyan')} received ${color(
    received,
    'cyan'
  )}, mode: ${color(mode, 'yellow')}`;
}
