export {};

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveWorkletData(times?: number): R;
      toHaveInlineStyleWarning(times?: number): R;
    }
  }
}

const UIworkletRegExp = /var _worklet_[0-9]+_init_data/g;
const inlineStyleWarningRegExp =
  /console\.warn\(require\("react-native-reanimated"\)\.getUseOfValueInStyleWarning\(\)\)/g;

expect.extend({
  toHaveWorkletData(received: string, expectedMatchCount: number = 1) {
    const receivedMatchCount = received.match(UIworkletRegExp)?.length;

    if (receivedMatchCount === expectedMatchCount) {
      return {
        message: () =>
          `Reanimated: expected code to have worklet data ${expectedMatchCount} times`,
        pass: true,
      };
    }
    return {
      message: () =>
        `Reanimated: expected code to have worklet data ${expectedMatchCount} times, but found ${receivedMatchCount}`,
      pass: false,
    };
  },
});

expect.extend({
  toHaveInlineStyleWarning(received: string, expectedMatchCount: number = 1) {
    const receivedMatchCount = received.match(inlineStyleWarningRegExp)?.length;

    if (receivedMatchCount === expectedMatchCount) {
      return {
        message: () =>
          `Reanimated: expected to have inline style warning ${expectedMatchCount} times`,
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
