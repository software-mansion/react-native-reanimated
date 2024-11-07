import { isColor } from 'react-native-reanimated';
import { ComparisonMode, isValidPropName } from '../types';
import type { Mismatch, TestValue } from '../types';
import { green, red, color, getColorSquare } from './stringFormatUtils';
import { getComparator, getComparisonModeForProp } from '../matchers/Comparators';

const VALUE_COLUMN_WIDTH = 15;
const INDEX_COLUMN_WIDTH = 7;

const VERTICAL_LINE = '│';
const VERTICAL_LINE_DOUBLE = '┃';
const HORIZONTAL_LINE = '━';

function prepareValueToTableCell(message: TestValue): string {
  if (message === undefined) {
    return 'undefined';
  } else if (message === null) {
    return 'null';
  } else if (typeof message === 'object') {
    return JSON.stringify(message);
  } else if (typeof message === 'number' || (typeof message === 'string' && Number(message) !== null)) {
    const messageNum = Number(message);
    const digitsAfterDot = messageNum.toString().split('.')?.[1]?.length || 0;
    for (let i = 0; i < digitsAfterDot; i++) {
      if (Math.abs(messageNum - Number(messageNum.toFixed(i))) < 0.00001) {
        return '≈' + messageNum.toFixed(i);
      }
    }
    return String(message);
  } else {
    return message?.toString();
  }
}

function adjustValueToLength(value: TestValue, length: number, valueKey?: string) {
  let valueStr = prepareValueToTableCell(value);
  let messageLen = valueStr.length;

  if (isColor(valueStr) && valueKey === 'backgroundColor' && messageLen + 3 <= VALUE_COLUMN_WIDTH) {
    valueStr += ' ' + getColorSquare(valueStr);
    messageLen += 3;
  }
  if (length > messageLen) {
    const indentSize = length - messageLen;
    return `${valueStr}${' '.repeat(indentSize)}`;
  } else {
    return valueStr.slice(0, length);
  }
}

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

    const comparisonMode = isValidPropName(key) ? getComparisonModeForProp(key) : ComparisonMode.AUTO;

    const match = getComparator(comparisonMode)(expectedValue, capturedValue);

    const expectedAdjusted = adjustValueToLength(expectedValue, VALUE_COLUMN_WIDTH, key);
    const capturedAdjusted = adjustValueToLength(capturedValue, VALUE_COLUMN_WIDTH, key);

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
