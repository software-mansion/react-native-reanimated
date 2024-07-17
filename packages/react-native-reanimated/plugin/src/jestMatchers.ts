/* eslint-disable @typescript-eslint/no-namespace */
export {};

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveWorkletData(times?: number): R;
      toHaveInlineStyleWarning(times?: number): R;
      toHaveLocation(location: string): R;
      toIncludeInWorkletString(expected: string): R;
    }
  }
}

const WORKLET_REGEX = /var _worklet_[0-9]+_init_data/g;
const INLINE_STYLE_WARNING_REGEX =
  /console\.warn\(require\("react-native-reanimated"\)\.getUseOfValueInStyleWarning\(\)\)/g;

expect.extend({
  toHaveWorkletData(received: string, expectedMatchCount = 1) {
    const receivedMatchCount = received.match(WORKLET_REGEX)?.length || 0;

    if (receivedMatchCount === expectedMatchCount) {
      return {
        message: () =>
          `Reanimated: found worklet data ${expectedMatchCount} times`,
        pass: true,
      };
    }
    return {
      message: () =>
        `Reanimated: expected code to have worklet data ${expectedMatchCount} times, but found ${receivedMatchCount}`,
      pass: false,
    };
  },

  toHaveInlineStyleWarning(received: string, expectedMatchCount = 1) {
    const receivedMatchCount =
      received.match(INLINE_STYLE_WARNING_REGEX)?.length || 0;

    if (receivedMatchCount === expectedMatchCount) {
      return {
        message: () =>
          `Reanimated: found inline style warning ${expectedMatchCount} times`,
        pass: true,
      };
    }
    return {
      message: () =>
        `Reanimated: expected to have inline style warning ${expectedMatchCount} times, but found ${receivedMatchCount}`,
      pass: false,
    };
  },

  toHaveLocation(received: string, expectedLocation: string) {
    const expectedString = `location: "${expectedLocation}"`;
    const hasLocation = received.includes(expectedLocation);
    if (hasLocation) {
      return {
        message: () => `Reanimated: found location ${expectedString}`,
        pass: true,
      };
    }
    return {
      message: () =>
        `Reanimated: expected to have location ${expectedString}, but it's not present`,
      pass: false,
    };
  },

  toIncludeInWorkletString(received: string, expected: string) {
    // Regular expression pattern to match the code field
    // @ts-ignore This regex works well in Jest.
    const pattern = /code: "((?:[^"\\]|\\.)*)"/gs;
    const matches = received.match(pattern);

    // If a match was found and the match group 1 (content within quotes) includes the expected string
    if (matches && matches.some((match) => match.includes(expected))) {
      // return true;
      return {
        message: () => `Reanimated: found ${expected} in worklet string`,
        pass: true,
      };
    }

    // If no match was found or the expected string is not a substring of the code field
    // return false;
    return {
      message: () =>
        `Reanimated: expected to find ${expected} in worklet string, but it's not present.`,
      pass: false,
    };
  },
});
