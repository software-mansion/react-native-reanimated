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
    reset: '\x1b[0m',
  };

  return `${COLOR_CODES[color]}${value}${COLOR_CODES.reset}`;
}

export function applyMarkdown(template: string) {
  const ANSI_CODES = {
    bold: '\x1b[1m',
    resetBold: '\x1b[22m',
    italic: '\x1b[3m',
    resetItalic: '\x1b[23m',
    reverse: '\x1b[7m',
    resetReverse: '\x1b[27m',
    underline: '\x1b[4m',
    resetUnderline: '\x1b[24m',
  };
  template = template.replace(/\*{3}(.+?)\*{3}(?!\*)/g, `${ANSI_CODES.reverse} $1 ${ANSI_CODES.resetReverse}`);
  template = template.replace(/\*{2}(.+?)\*{2}(?!\*)/g, `${ANSI_CODES.bold}$1${ANSI_CODES.resetBold}`);
  template = template.replace(/\*{1}(.+?)\*{1}(?!\*)/g, `${ANSI_CODES.italic}$1${ANSI_CODES.resetItalic}`);
  template = template.replace(/_(.+?)_(?!_)/g, `${ANSI_CODES.underline}$1${ANSI_CODES.resetUnderline}`);

  return template;
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
