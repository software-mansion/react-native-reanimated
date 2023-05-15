export {};
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveWorkletData(times?: number): R;
      toHaveInlineStyleWarning(times?: number): R;
    }
  }
}

expect.extend({
  toHaveWorkletData(received: string, times?: number) {
    const UIworkletRegExp = /var _worklet_[0-9]+_init_data/g;
    const match = received.match(UIworkletRegExp)?.length;

    if (times !== undefined) {
      if (match === times) {
        return {
          message: () =>
            `Reanimated: expected code to have worklet data ${times} times`,
          pass: true,
        };
      }
      return {
        message: () =>
          `Reanimated: expected code to have worklet data ${times} times, but found ${match}`,
        pass: false,
      };
    }
    if (match) {
      return {
        message: () => 'Reanimated: expected code to have worklet data',
        pass: true,
      };
    }
    return {
      message: () => 'Reanimated: expected code not to have worklet data',
      pass: false,
    };
  },
});

expect.extend({
  toHaveInlineStyleWarning(received: string, times?: number) {
    const inlineStyleWarningRegExp =
      /console\.warn\(require\("react-native-reanimated"\)\.getUseOfValueInStyleWarning\(\)\)/g;
    const match = received.match(inlineStyleWarningRegExp)?.length;

    if (times !== undefined) {
      if (match === times) {
        return {
          message: () =>
            `Reanimated: expected to have inline style warning ${times} times`,
          pass: true,
        };
      }
      return {
        message: () =>
          `Reanimated: expected to have inline style warning ${times} times, but found ${match}`,
        pass: false,
      };
    }
    if (match) {
      return {
        message: () => 'Reanimated: expected to have inline style warning',
        pass: true,
      };
    }
    return {
      message: () => 'Reanimated: expected not to have inline style warning',
      pass: false,
    };
  },
});
