import type { Mismatch, NullableTestValue } from './types';

export function indentNestingLevel(nestingLevel: number) {
  return `  ${'   '.repeat(nestingLevel)}`;
}

export function adjustStringToLength(message: undefined | string | number, length: number) {
  const messageStr = message ? message.toString() : '';
  const messageLen = messageStr.length;
  if (length > messageLen) {
    const indentSize = length - messageLen;
    return `${messageStr}${' '.repeat(indentSize)}`;
  } else {
    return messageStr.slice(0, length);
  }
}

export function color(
  value: NullableTestValue,
  color: 'cyan' | 'gray' | 'green' | 'yellow' | 'red' | 'lightGray' | 'orange',
) {
  const COLOR_CODES = {
    cyan: '\x1b[36m',
    gray: '\x1b[38;5;242m',
    lightGray: '\x1b[37m',
    green: '\x1b[92m',
    yellow: '\x1b[93m',
    red: '\x1b[91m',
    orange: '\x1b[38;5;208m',
    reset: '\x1b[0m',
  };
  const stringValue = typeof value === 'object' ? JSON.stringify(value) : value?.toString();
  return `${COLOR_CODES[color]}${stringValue}${COLOR_CODES.reset}`;
}

export function cyan(x: NullableTestValue) {
  return color(x, 'cyan');
}
export function gray(x: NullableTestValue) {
  return color(x, 'gray');
}
export function green(x: NullableTestValue) {
  return color(x, 'green');
}
export function yellow(x: NullableTestValue) {
  return color(x, 'yellow');
}
export function red(x: NullableTestValue) {
  return color(x, 'red');
}
export function orange(x: NullableTestValue) {
  return color(x, 'orange');
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
    if (value instanceof Error) {
      return `**${value.name}** "${value.message}"`;
    }
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

export function formatSnapshotMismatch(mismatches: Array<Mismatch>, native: boolean) {
  /**      | HEIGHT             | WIDTH              |
   index | EXPECTED | ACTUAL  | EXPECTED | ACTUAL  |
   */

  const keysToPrint: Array<string> = [];
  mismatches.forEach(({ expectedSnapshot, capturedSnapshot }) => {
    Object.keys(expectedSnapshot).forEach(key => {
      if (!keysToPrint.includes(key)) {
        keysToPrint.push(key);
      }
    });
    Object.keys(capturedSnapshot).forEach(key => {
      if (!keysToPrint.includes(key)) {
        keysToPrint.push(key);
      }
    });
  });

  const valueColumnWidth = 15;
  const indexColumnWidth = 7;

  const row1 =
    ' '.repeat(indexColumnWidth) +
    '|' +
    keysToPrint.map(key => adjustStringToLength(key, 2 * valueColumnWidth + 1)).join('|');

  const row2 =
    adjustStringToLength('index', indexColumnWidth) +
    '|' +
    keysToPrint
      .map(
        _ =>
          adjustStringToLength(native ? 'native' : 'expected', valueColumnWidth) +
          '|' +
          adjustStringToLength(native ? 'js' : 'captured', valueColumnWidth),
      )
      .join('|');

  const emptyRow =
    '-'.repeat(indexColumnWidth) +
    ('+' + '-'.repeat(valueColumnWidth) + '+' + '-'.repeat(valueColumnWidth)).repeat(keysToPrint.length);

  const remainingRows = mismatches.map(
    ({ index, expectedSnapshot, capturedSnapshot }) =>
      adjustStringToLength(index.toString(), indexColumnWidth) +
      '|' +
      keysToPrint
        .map(
          key =>
            green(adjustStringToLength(expectedSnapshot[key as keyof typeof expectedSnapshot], valueColumnWidth)) +
            '|' +
            red(adjustStringToLength(capturedSnapshot[key as keyof typeof capturedSnapshot], valueColumnWidth)),
        )
        .join('|'),
  );

  return [row1, row2, emptyRow, ...remainingRows].join('\n');
}

export const EMPTY_LOG_PLACEHOLDER = color(applyMarkdown('***   ***'), 'lightGray');
