import { ComparisonMode, TestValue } from './types';

const DISTANCE_TOLERANCE = 0.5;

const COMPARATORS: {
  [Key: string]: (expected: TestValue, value: TestValue) => boolean;
} = {
  [ComparisonMode.STRING]: (expected, value) => {
    return value === expected;
  },

  [ComparisonMode.NUMBER]: (expected, value) => {
    const bothAreNumbers = typeof value === 'number' && typeof expected === 'number';
    const bothAreNaN = bothAreNumbers && isNaN(value) && isNaN(expected);
    return bothAreNaN || value === expected;
  },

  [ComparisonMode.COLOR]: (expected, value) => {
    if (typeof value !== 'string' || typeof expected !== 'string') {
      return false;
    }
    const expectedUnified = expected.toLowerCase();
    const colorRegex = new RegExp('^#?([a-f0-9]{6})$');
    if (!colorRegex.test(expectedUnified)) {
      throw Error(`Invalid color format "${expectedUnified}", please use hex color (like #123abc)`);
    }
    return value === expected;
  },

  [ComparisonMode.DISTANCE]: (expected, value) => {
    const valueAsNumber = Number(value);
    return !isNaN(valueAsNumber) && Math.abs(valueAsNumber - Number(expected)) < DISTANCE_TOLERANCE;
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
    if (typeof expected !== 'object' || typeof value !== 'object') {
      return false;
    }
    const expectedKeys = Object.keys(expected);
    const valueKeys = Object.keys(value);
    if (expectedKeys.length !== valueKeys.length) {
      return false;
    }
    for (const key of expectedKeys) {
      if (!COMPARATORS[ComparisonMode.AUTO](expected[key as keyof typeof expected], value[key as keyof typeof value])) {
        return false;
      }
    }
    return true;
  },

  [ComparisonMode.AUTO]: (expected, value) => {
    if (typeof expected === 'number') {
      return COMPARATORS[ComparisonMode.DISTANCE](expected, value);
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
    return expected === value;
  },
};

export function getComparator(mode: ComparisonMode) {
  return COMPARATORS[mode];
}
