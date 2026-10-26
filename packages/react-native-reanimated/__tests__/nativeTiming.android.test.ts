import type * as Reanimated from '../src';
import type { AnimationObject } from '../src/commonTypes';

let mockEnabledFlag = '';

jest.mock('../src/featureFlags', () => ({
  ...jest.requireActual('../src/featureFlags'),
  getStaticFeatureFlag: (name: string) => name === mockEnabledFlag,
}));

function describeWith(
  enabledFlag: string,
  create: (reanimated: typeof Reanimated) => unknown
) {
  mockEnabledFlag = enabledFlag;
  let description: unknown;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockPlatform } = require('../jest/utils') as {
      mockPlatform: (os: string, priorityKeys: string[]) => void;
    };
    mockPlatform('android', ['android', 'native']);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const reanimated = require('../src') as typeof Reanimated;
    const runtimeKind = globalThis.__RUNTIME_KIND;
    globalThis.__RUNTIME_KIND = 2;
    try {
      const animation = create(reanimated);
      description = (animation as AnimationObject).__nativeTiming;
    } finally {
      globalThis.__RUNTIME_KIND = runtimeKind;
    }
  });
  return description;
}

const timing = ({ Easing, withTiming }: typeof Reanimated) =>
  withTiming(10, { duration: 200, easing: Easing.linear });
const spring = ({ withSpring }: typeof Reanimated) => withSpring(10);

describe('native timing description on Android', () => {
  test('the Android native layout flag gives a description', () => {
    expect(describeWith('ANDROID_NATIVE_LAYOUT_ANIMATIONS', timing)).toEqual({
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

  test('the Android native layout flag gives a spring a description', () => {
    expect(describeWith('ANDROID_NATIVE_LAYOUT_ANIMATIONS', spring)).toEqual({
      phases: [expect.objectContaining({ kind: 'spring', toValue: 10 })],
    });
  });

  test.each([
    ['a timing', timing],
    ['a spring', spring],
  ])('the iOS native layout flag gives %s no description', (_, create) => {
    expect(
      describeWith('IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION', create)
    ).toBeUndefined();
  });
});
