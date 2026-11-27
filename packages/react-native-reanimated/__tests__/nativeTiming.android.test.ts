import type * as Reanimated from '../src';
import type { AnimationObject } from '../src/commonTypes';

let mockEnabledFlag = '';

jest.mock('../src/featureFlags', () => ({
  ...jest.requireActual('../src/featureFlags'),
  getStaticFeatureFlag: (name: string) => name === mockEnabledFlag,
}));

function describeTimingWith(enabledFlag: string) {
  mockEnabledFlag = enabledFlag;
  let description: unknown;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockPlatform } = require('../jest/utils') as {
      mockPlatform: (os: string, priorityKeys: string[]) => void;
    };
    mockPlatform('android', ['android', 'native']);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Easing, withTiming } = require('../src') as typeof Reanimated;
    const runtimeKind = globalThis.__RUNTIME_KIND;
    globalThis.__RUNTIME_KIND = 2;
    try {
      const animation = withTiming(10, {
        duration: 200,
        easing: Easing.linear,
      });
      description = (animation as unknown as AnimationObject).__nativeTiming;
    } finally {
      globalThis.__RUNTIME_KIND = runtimeKind;
    }
  });
  return description;
}

describe('native timing description on Android', () => {
  test('the Android native layout flag gives a description', () => {
    expect(describeTimingWith('ANDROID_NATIVE_LAYOUT_ANIMATIONS')).toEqual({
      phases: [
        {
          kind: 'timing',
          durationMs: 200,
          toValue: 10,
          easing: { kind: 'linear' },
        },
      ],
    });
  });

  test('the iOS native layout flag gives no description', () => {
    expect(
      describeTimingWith('IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION')
    ).toBeUndefined();
  });
});
