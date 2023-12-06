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

export function color(text: any, color: 'yellow' | 'cyan' | 'green') {
  switch (color) {
    case 'yellow':
      return `\x1b[33m${text}\x1b[0m`;
    case 'cyan':
      return `\x1b[36m${text}\x1b[0m`;
    case 'green':
      return `\x1b[32m${text}\x1b[0m`;
  }
}

export function defaultTestErrorLog(expected: any, received: any) {
  return `Expected ${color(expected, 'cyan')} received ${color(
    received,
    'cyan'
  )}`;
}
