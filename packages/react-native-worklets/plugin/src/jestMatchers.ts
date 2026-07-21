/* eslint-disable @typescript-eslint/no-namespace */
export {};

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveInlineStyleWarning(times?: number): R;
    }
  }
}

const INLINE_STYLE_WARNING_REGEX =
  /console\.warn\(require\("react-native-reanimated"\)\.getUseOfValueInStyleWarning\(\)\)/g;

expect.extend({
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
});
