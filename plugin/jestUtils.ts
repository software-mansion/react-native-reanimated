/* eslint-disable @typescript-eslint/no-namespace */
export {};

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveWorkletData(times?: number): R;
      toHaveInlineStyleWarning(times?: number): R;
      toHaveLocation(location: string): R;
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
});
