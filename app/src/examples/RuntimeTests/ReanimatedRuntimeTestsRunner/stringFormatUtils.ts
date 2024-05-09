import { NullableTestValue } from './types';

export const RUNTIME_TEST_ERRORS = {
  UNDEFINED_TEST_SUITE: 'Undefined test suite context',
  UNDEFINED_TEST_CASE: 'Undefined test case context',
  NO_MOCKED_TIMESTAMP: "Seems that you've forgot to call `mockAnimationTimer()`",
};

export function indentNestingLevel(nestingLevel: number) {
  return `  ${'   '.repeat(nestingLevel)}`;
}

export function appendWhiteSpaceToMatchLength(message: string | number, length: number) {
  const messageStr = message.toString();
  const messageLen = messageStr.length;
  const indentSize = Math.max(0, length - messageLen);
  return `${messageStr}${' '.repeat(indentSize)}`;
}

export function color(value: NullableTestValue, color: 'yellow' | 'cyan' | 'green' | 'red' | 'gray' | 'orange') {
  const COLOR_CODES = {
    red: '\x1b[91m',
    green: '\x1b[92m',
    yellow: '\x1b[93m',
    cyan: '\x1b[36m',
    gray: '\x1b[38;5;242m',
    orange: '\x1b[38;5;208m',
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
