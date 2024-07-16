import { isColor, processColor } from 'react-native-reanimated';
import type { TestValue, ValidPropNames } from '../types';
import { ComparisonMode, isValidPropName } from '../types';

const DISTANCE_TOLERANCE = 0.5;

const COMPARATORS: {
  [Key: string]: (expected: TestValue, value: TestValue) => boolean;
} = {
  [ComparisonMode.STRING]: (expected, value) => {
    return typeof expected === 'string' && typeof value === 'string' && value === expected;
  },

  [ComparisonMode.NUMBER]: (expected, value) => {
    const bothAreNumbers = typeof value === 'number' && typeof expected === 'number';
    const bothAreBigInts = typeof value === 'bigint' && typeof expected === 'bigint';
    const bothAreNaNs = bothAreNumbers && isNaN(value) && isNaN(expected);
    return bothAreNaNs || ((bothAreNumbers || bothAreBigInts) && value === expected);
  },

  [ComparisonMode.FLOAT]: (expected, value) => {
    const bothAreNumbers = typeof value === 'number' && typeof expected === 'number';
    const bothAreNaNs = bothAreNumbers && isNaN(value) && isNaN(expected);
    return bothAreNaNs || Math.abs(Number(value) - Number(expected)) < Number.EPSILON;
  },

  [ComparisonMode.COLOR]: (expected, value) => {
    if (!isColor(expected) || !isColor(value)) {
      return false;
    }
    return processColor(expected) === processColor(value);
  },

  [ComparisonMode.PIXEL]: (expected, value) => {
    const valueAsNumber = Number(value);
    return !isNaN(valueAsNumber) && Math.abs(valueAsNumber - Number(expected)) < DISTANCE_TOLERANCE;
  },

  [ComparisonMode.FLOAT_DISTANCE]: (expected, value) => {
    const bothAreNumbers = typeof value === 'number' && typeof expected === 'number';
    const bothAreNaNs = bothAreNumbers && isNaN(value) && isNaN(expected);
    return bothAreNaNs || Math.abs(Number(value) - Number(expected)) < 0.00001;
  },

  [ComparisonMode.ARRAY]: (expected, value) => {
    if (!Array.isArray(expected) || !Array.isArray(value)) {
      return false;
    }
    if (expected.length !== value.length) {
      return false;
    }
    for (let i = 0; i < expected.length; i++) {
      if (!COMPARATORS[ComparisonMode.AUTO](expected[i] as TestValue, value[i] as TestValue)) {
        return false;
      }
    }
    return true;
  },

  [ComparisonMode.OBJECT]: (expected, value) => {
    if (expected === null || value === null) {
      return expected === null && value === null;
    }
    if (expected === undefined || value === undefined) {
      return expected === undefined && value === undefined;
    }
    if (typeof expected !== 'object' || typeof value !== 'object') {
      return false;
    }

    const expectedKeys = Object.keys(expected);
    const valueKeys = Object.keys(value);
    if (expectedKeys.length !== valueKeys.length) {
      return false;
    }
    for (const key of expectedKeys) {
      const comparisonMode = isValidPropName(key) ? getComparisonModeForProp(key) : ComparisonMode.AUTO;
      if (!COMPARATORS[comparisonMode](expected[key as keyof typeof expected], value[key as keyof typeof value])) {
        return false;
      }
    }

    return true;
  },

  [ComparisonMode.AUTO]: (expected, value) => {
    if (typeof expected === 'number') {
      return COMPARATORS[ComparisonMode.PIXEL](expected, value);
    }
    if (typeof expected === 'string') {
      return COMPARATORS[ComparisonMode.STRING](expected, value);
    }
    if (Array.isArray(expected)) {
      return COMPARATORS[ComparisonMode.ARRAY](expected, value);
    }
    if (typeof expected === 'object') {
      return COMPARATORS[ComparisonMode.OBJECT](expected, value);
    }
    return typeof expected === typeof value && expected === value;
  },
};

export function getComparator(mode: ComparisonMode) {
  return COMPARATORS[mode];
}

export function getComparisonModeForProp(prop: ValidPropNames): ComparisonMode {
  const propToComparisonModeDict = {
    zIndex: ComparisonMode.NUMBER,
    opacity: ComparisonMode.FLOAT_DISTANCE,
    width: ComparisonMode.PIXEL,
    height: ComparisonMode.PIXEL,
    top: ComparisonMode.PIXEL,
    left: ComparisonMode.PIXEL,
    backgroundColor: ComparisonMode.COLOR,
  };
  return propToComparisonModeDict[prop];
}
