import { TestValue } from './types';

export const RUNTIME_TEST_ERRORS = {
  UNDEFINED_TEST_SUITE: 'Undefined test suite context',
  UNDEFINED_TEST_CASE: 'Undefined test case context',
  NO_MOCKED_TIMESTAMP: "Seems that you've forgot to call `mockAnimationTimer()`",
};

export function logInFrame(text: string) {
  console.log(`\t╔${'═'.repeat(text.length + 2)}╗`);
  console.log(`\t║ ${text} ║`);
  console.log(`\t╚${'═'.repeat(text.length + 2)}╝`);
}

export function appendWhiteSpaceToMatchLength(message: string | number, length: number) {
  const messageStr = message.toString();
  const messageLen = messageStr.length;
  return `${messageStr}${' '.repeat(length - messageLen)}`;
}

export function color(value: TestValue, color: 'yellow' | 'cyan' | 'green' | 'red') {
  const COLOR_CODES = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
  };

  return `${COLOR_CODES[color]}${value}\x1b[0m`;
}

export function formatString(template: string, variableObject: unknown, index: number) {
  const valueToString: (arg0: unknown) => string = (value: unknown) => {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    if (typeof value === 'function') {
      return value.name;
    }
    return value?.toString() || '';
  };
  let testName = template;

  testName = testName.replace(/%#/g, index.toString());

  if (variableObject === null) {
    return testName;
  }
  if (Array.isArray(variableObject)) {
    variableObject.forEach((value, index) => {
      // python-like syntax ${1} {2}
      testName = testName.replace('${' + index + '}', valueToString(value));
    });
  }
  if (typeof variableObject === 'object') {
    const keys = Object.keys(variableObject);
    keys.forEach(k => {
      // Typical object literal syntax
      testName = testName.replace('${' + k + '}', valueToString(variableObject[k as keyof typeof variableObject]));
    });
  }

  // Allow printf formatting used in jest
  testName = testName.replace(/%(p|s|i|f)/, valueToString(variableObject));

  return testName;
}
