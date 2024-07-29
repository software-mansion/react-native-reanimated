import type { Mismatch, TestValue } from '../types';

export function indentNestingLevel(nestingLevel: number) {
  return `  ${'   '.repeat(nestingLevel)}`;
}

function valueToPrettyString(message: TestValue): string {
  if (message === undefined) {
    return 'undefined';
  } else if (message === null) {
    return 'null';
  } else if (typeof message === 'object') {
    return JSON.stringify(message);
  } else if (typeof message === 'number') {
    const digitsAfterDot = message.toString().split('.')?.[1]?.length || 0;

    for (let i = 0; i < digitsAfterDot; i++) {
      if (Math.abs(message - Number(message.toFixed(i))) < 0.00001) {
        return '≈' + message.toFixed(i);
      }
    }
    return String(message);
  } else {
    return message?.toString();
  }
}

function adjustValueToLength(value: TestValue, length: number) {
  const valueStr = valueToPrettyString(value);

  const messageLen = valueStr.length;
  if (length > messageLen) {
    const indentSize = length - messageLen;
    return `${valueStr}${' '.repeat(indentSize)}`;
  } else {
    return valueStr.slice(0, length);
  }
}

export function color(value: TestValue, color: 'cyan' | 'gray' | 'green' | 'yellow' | 'red' | 'lightGray' | 'orange') {
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

export function cyan(x: TestValue) {
  return color(x, 'cyan');
}
export function gray(x: TestValue) {
  return color(x, 'gray');
}
export function green(x: TestValue) {
  return color(x, 'green');
}
export function yellow(x: TestValue) {
  return color(x, 'yellow');
}
export function red(x: TestValue) {
  return color(x, 'red');
}
export function orange(x: TestValue) {
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

const VALUE_COLUMN_WIDTH = 15;
const INDEX_COLUMN_WIDTH = 7;

const VERTICAL_LINE = '│';
const VERTICAL_LINE_DOUBLE = '┃';
const HORIZONTAL_LINE = '━';

function getBorderLine(keys: Array<string>, type: 'top' | 'bottom' | 'mid') {
  const leftEdge = { top: '╭', mid: '├', bottom: '╰' };
  const rightEdge = { top: '╮', mid: '┤', bottom: '╯' };
  const boldLineJoint = { top: '┳', mid: '╋', bottom: '┻' };
  const singleLineJoint = { top: '┯', mid: '┷', bottom: HORIZONTAL_LINE };

  return (
    leftEdge[type] +
    HORIZONTAL_LINE.repeat(INDEX_COLUMN_WIDTH) +
    boldLineJoint[type] +
    keys
      .map(
        _key =>
          HORIZONTAL_LINE.repeat(VALUE_COLUMN_WIDTH) +
          singleLineJoint[type] +
          HORIZONTAL_LINE.repeat(VALUE_COLUMN_WIDTH),
      )
      .join(boldLineJoint[type]) +
    rightEdge[type]
  );
}

function getUpperTableHeader(keys: Array<string>) {
  return (
    ' '.repeat(INDEX_COLUMN_WIDTH) +
    VERTICAL_LINE_DOUBLE +
    keys
      .map(
        key =>
          adjustValueToLength(key, VALUE_COLUMN_WIDTH) + VERTICAL_LINE + adjustValueToLength(key, VALUE_COLUMN_WIDTH),
      )
      .join(VERTICAL_LINE_DOUBLE)
  );
}

function getLowerTableHeader(keys: Array<string>, native: boolean) {
  const columnPair =
    adjustValueToLength(native ? 'native' : 'expected', VALUE_COLUMN_WIDTH) +
    VERTICAL_LINE +
    adjustValueToLength(native ? 'js' : 'captured', VALUE_COLUMN_WIDTH);

  return (
    adjustValueToLength('index', INDEX_COLUMN_WIDTH) +
    VERTICAL_LINE_DOUBLE +
    keys.map(_ => columnPair).join(VERTICAL_LINE_DOUBLE)
  );
}

function withSideBorders(line: string) {
  return VERTICAL_LINE + line + VERTICAL_LINE;
}

function getComparisonRow(mismatch: Mismatch, keys: Array<string>) {
  const { index, capturedSnapshot, expectedSnapshot } = mismatch;
  const indexColumn = adjustValueToLength(index.toString(), INDEX_COLUMN_WIDTH);
  const formattedCells = keys.map(key => {
    const expectedValue = expectedSnapshot[key as keyof typeof expectedSnapshot];
    const capturedValue = capturedSnapshot[key as keyof typeof capturedSnapshot];

    const match = expectedValue === capturedValue;

    const expectedAdjusted = adjustValueToLength(expectedValue, VALUE_COLUMN_WIDTH);
    const capturedAdjusted = adjustValueToLength(capturedValue, VALUE_COLUMN_WIDTH);

    const expectedColored = match ? expectedAdjusted : green(expectedAdjusted);
    const capturedColored = match ? capturedAdjusted : red(capturedAdjusted);

    return expectedColored + color(VERTICAL_LINE, 'gray') + capturedColored;
  });

  return indexColumn + VERTICAL_LINE_DOUBLE + formattedCells.join(VERTICAL_LINE_DOUBLE);
}

export function formatSnapshotMismatch(mismatches: Array<Mismatch>, native: boolean) {
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

  const topLine = getBorderLine(keysToPrint, 'top');
  const upperHeader = withSideBorders(getUpperTableHeader(keysToPrint));
  const lowerHeader = withSideBorders(getLowerTableHeader(keysToPrint, native));
  const separatorLine = getBorderLine(keysToPrint, 'mid');
  const mismatchRows = mismatches.map(mismatch => withSideBorders(getComparisonRow(mismatch, keysToPrint)));
  const bottomLine = getBorderLine(keysToPrint, 'bottom');

  return [topLine, upperHeader, lowerHeader, separatorLine, ...mismatchRows, bottomLine].join('\n');
}

export const EMPTY_LOG_PLACEHOLDER = color(applyMarkdown('***   ***'), 'lightGray');
