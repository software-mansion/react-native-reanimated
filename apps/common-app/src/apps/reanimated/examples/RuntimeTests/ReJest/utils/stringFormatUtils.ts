import { isColor, processColor } from 'react-native-reanimated';

import type { TestValue } from '../types';

const RESET_BACKGROUND = '\x1b[49m';
const TEST_COLOR = '\x1b[38;5;242m';

const COLOR_CODES = {
  cyan: '\x1b[36m',
  gray: TEST_COLOR,
  lightGray: '\x1b[37m',
  green: '\x1b[92m',
  yellow: '\x1b[93m',
  red: '\x1b[91m',
  orange: '\x1b[38;5;208m',
  reset: '\x1b[0m',
};

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

type SupportedColors = keyof typeof COLOR_CODES;

export function indentNestingLevel(nestingLevel: number) {
  const HALF_INDENT = ' '.repeat(2);
  const INDENT = ' '.repeat(4);
  return `${HALF_INDENT}${INDENT.repeat(nestingLevel)}`;
}

export function color(value: TestValue, color: SupportedColors) {
  const stringValue = typeof value === 'object' ? JSON.stringify(value) : value?.toString();
  return `${COLOR_CODES[color]}${stringValue}${COLOR_CODES.reset}`;
}
export const cyan = (x: TestValue) => color(x, 'cyan');
export const gray = (x: TestValue) => color(x, 'gray');
export const green = (x: TestValue) => color(x, 'green');
export const yellow = (x: TestValue) => color(x, 'yellow');
export const red = (x: TestValue) => color(x, 'red');
export const orange = (x: TestValue) => color(x, 'orange');

export const EMPTY_LOG_PLACEHOLDER = color(applyMarkdown('***   ***'), 'lightGray');

export function applyMarkdown(template: string) {
  template = template.replace(/\*{3}(.+?)\*{3}(?!\*)/g, `${ANSI_CODES.reverse} $1 ${ANSI_CODES.resetReverse}`);
  template = template.replace(/\*{2}(.+?)\*{2}(?!\*)/g, `${ANSI_CODES.bold}$1${ANSI_CODES.resetBold}`);
  template = template.replace(/\*{1}(.+?)\*{1}(?!\*)/g, `${ANSI_CODES.italic}$1${ANSI_CODES.resetItalic}`);
  template = template.replace(/_(.+?)_(?!_)/g, `${ANSI_CODES.underline}$1${ANSI_CODES.resetUnderline}`);

  return template;
}

function rgbToAnsi256(red: number, green: number, blue: number) {
  if (red === green && green === blue) {
    if (red < 8) {
      return 16; // BLACK
    }
    if (red > 248) {
      return 231; // WHITE
    }
    return Math.round(((red - 8) / 247) * 24) + 232;
  }

  const [scaledRed, scaledGreen, scaledBlue] = [red, green, blue].map(col => Math.round((col / 255) * 5));
  return 16 + 36 * scaledRed + 6 * scaledGreen + scaledBlue;
}

export function getColorSquare(color: unknown) {
  if (!isColor(color)) {
    return '??';
  }
  const colorNumber = processColor(color) as number;
  /* eslint-disable no-bitwise */
  const red = (colorNumber >> 16) & 255;
  const green = (colorNumber >> 8) & 255;
  const blue = colorNumber & 255;
  /* eslint-enable no-bitwise */
  const colorAnsi = `\x1b[48;5;${rgbToAnsi256(red, green, blue)}m`;
  return colorAnsi + '  ' + RESET_BACKGROUND;
}

export function formatTestName(template: string, variableObject: unknown, index: number) {
  const valueToString: (arg0: unknown) => string = (value: unknown) => {
    if (value instanceof Error) {
      return `**${value.name}** "${value.message}"`;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    if (typeof value === 'function') {
      return value.name;
    }

    if (isColor(value)) {
      return value?.toString() + ' ' + getColorSquare(value);
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
