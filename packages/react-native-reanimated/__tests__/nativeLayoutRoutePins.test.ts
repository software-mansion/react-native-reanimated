import * as Reanimated from '../src';
import { Easing, withTiming } from '../src';
import type {
  EasingFunction,
  LayoutAnimation,
  LayoutAnimationValues,
} from '../src/commonTypes';
import { initializeLayoutAnimationsManager } from '../src/layoutReanimation/animationsManager.native';

jest.mock('../src/featureFlags', () => ({
  ...jest.requireActual('../src/featureFlags'),
  getStaticFeatureFlag: (name: string) =>
    name === 'IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION',
}));

jest.mock('react-native-worklets', () =>
  jest.requireActual('../../react-native-worklets/src/mock')
);

initializeLayoutAnimationsManager();
const manager = globalThis.LayoutAnimationsManager;

const LIMITS = { leaves: 6, transformOperations: 4, segments: 64 };
const SIZES: [number, number][] = [
  [50, 50],
  [100, 60],
  [200, 200],
  [300, 300],
  [393, 852],
];
const EASINGS = { bounce: Easing.bounce, exp: Easing.exp };
type EasingName = keyof typeof EASINGS;

const valuesOf = ([width, height]: [number, number]) =>
  ({
    targetOriginX: 30,
    targetOriginY: 60,
    targetWidth: width,
    targetHeight: height,
    targetGlobalOriginX: 30,
    targetGlobalOriginY: 60,
    currentOriginX: 10,
    currentOriginY: 20,
    currentWidth: width,
    currentHeight: height,
    currentGlobalOriginX: 10,
    currentGlobalOriginY: 20,
    windowWidth: 393,
    windowHeight: 852,
  }) as LayoutAnimationValues;

type Config = (values: LayoutAnimationValues) => LayoutAnimation;
type Form = { name: string; configOf: (easing: EasingFunction) => Config };
type Preset = new () => {
  easing: (easing: EasingFunction) => { build: () => Config };
};

const presetOf = (name: string): Form => ({
  name,
  configOf: (easing) =>
    new (Reanimated as unknown as Record<string, Preset>)[name]()
      .easing(easing)
      .build(),
});

const operationOf = (
  name: string,
  kind: string,
  from: number | string,
  to: number | string
): Form => ({
  name,
  configOf: (easing) => () =>
    ({
      initialValues: { transform: [{ [kind]: from }] },
      animations: {
        transform: [{ [kind]: withTiming(to, { duration: 400, easing }) }],
      },
    }) as LayoutAnimation,
});
const rotation = (to: string) =>
  operationOf(`a rotation from 0deg to ${to}`, 'rotate', '0deg', to);
const translation = (from: number) =>
  operationOf(`a translateX from ${from} to 0`, 'translateX', from, 0);

const onUIRuntime = <T>(create: () => T): T => {
  const runtimeKind = globalThis.__RUNTIME_KIND;
  globalThis.__RUNTIME_KIND = 2;
  try {
    return create();
  } finally {
    globalThis.__RUNTIME_KIND = runtimeKind;
  }
};

let lastBuildId = 7000;
/**
 * `N`: each leaf has a track. `T`: a leaf has no fit (UnsupportedTiming). `R`:
 * ResourceLimit.
 */
function routeOf(config: Config, size: [number, number]) {
  const buildId = ++lastBuildId;
  const values = valuesOf(size);
  const summary = manager.build(
    buildId,
    values,
    () => onUIRuntime(() => config(values)),
    LIMITS,
    []
  )!;
  manager.releaseBuilt(buildId);
  if (summary.exceedsLimit) {
    return 'R';
  }
  return summary.leaves.every(({ track }) => track) ? 'N' : 'T';
}

/**
 * Forms that the native route played before the fit tolerance of a transform
 * operation followed the span of the operation and the size of the view, and
 * before the segment budget counted each operation timeline. Each row has an
 * easing, the route on views of 50 x 50, 100 x 60, 200 x 200, 300 x 300, and
 * 393 x 852 pt, and the presets and operations that have these routes.
 */
const PINS: [EasingName, string, (string | Form)[]][] = [
  [
    'bounce',
    'NNNNT',
    [
      'FlipInEasyX',
      'FlipInEasyY',
      'FlipInXDown',
      'FlipInXUp',
      'FlipInYLeft',
      'FlipInYRight',
      'FlipOutEasyX',
      'FlipOutEasyY',
      'FlipOutXDown',
      'FlipOutXUp',
      'FlipOutYLeft',
      'FlipOutYRight',
      'ZoomInEasyDown',
      'ZoomInEasyUp',
      'ZoomOutEasyDown',
      'ZoomOutEasyUp',
      rotation('90deg'),
    ],
  ],
  [
    'exp',
    'NNNTT',
    [
      'FlipInEasyX',
      'FlipInEasyY',
      'FlipInXDown',
      'FlipInXUp',
      'FlipInYLeft',
      'FlipInYRight',
      'FlipOutEasyX',
      'FlipOutEasyY',
      'FlipOutXDown',
      'FlipOutXUp',
      'FlipOutYLeft',
      'FlipOutYRight',
      'RotateInDownLeft',
      'RotateInDownRight',
      'RotateInUpLeft',
      'RotateInUpRight',
      'RotateOutDownLeft',
      'RotateOutDownRight',
      'RotateOutUpLeft',
      'RotateOutUpRight',
      'ZoomInEasyDown',
      'ZoomInEasyUp',
      'ZoomOutEasyDown',
      'ZoomOutEasyUp',
      rotation('90deg'),
    ],
  ],
  ['bounce', 'RRTTT', ['PinwheelIn', 'PinwheelOut']],
  ['exp', 'NTTTT', ['PinwheelIn', 'PinwheelOut', rotation('360deg')]],
  [
    'bounce',
    'NNNTT',
    [
      'RollInLeft',
      'RollInRight',
      'RollOutLeft',
      'RollOutRight',
      rotation('180deg'),
    ],
  ],
  [
    'exp',
    'TTTTT',
    [
      'RollInLeft',
      'RollInRight',
      'RollOutLeft',
      'RollOutRight',
      'ZoomInDown',
      'ZoomInLeft',
      'ZoomInRight',
      'ZoomInUp',
      'ZoomOutDown',
      'ZoomOutLeft',
      'ZoomOutRight',
      'ZoomOutUp',
      rotation('720deg'),
      translation(393),
      translation(1000),
    ],
  ],
  [
    'bounce',
    'NRNNT',
    [
      'RotateInDownLeft',
      'RotateInDownRight',
      'RotateInUpLeft',
      'RotateInUpRight',
      'RotateOutDownLeft',
      'RotateOutDownRight',
      'RotateOutUpLeft',
      'RotateOutUpRight',
    ],
  ],
  [
    'bounce',
    'TTTTT',
    ['ZoomInDown', 'ZoomInUp', 'ZoomOutDown', 'ZoomOutUp', translation(1000)],
  ],
  ['exp', 'NNTTT', [rotation('180deg')]],
  ['bounce', 'NNTTT', [rotation('360deg')]],
  ['bounce', 'NTTTT', [rotation('720deg')]],
];

describe('the route of a layout animation on views of five sizes', () => {
  const originalGetAnimationTimestamp = globalThis._getAnimationTimestamp;
  const originalFinalizer = globalThis.requestAnimationFrameFinalizer;

  beforeEach(() => {
    globalThis._getAnimationTimestamp = () => 1000;
    globalThis.requestAnimationFrameFinalizer = jest.fn();
  });

  afterEach(() => {
    globalThis._getAnimationTimestamp = originalGetAnimationTimestamp;
    globalThis.requestAnimationFrameFinalizer = originalFinalizer;
  });

  for (const [easingName, routes, forms] of PINS) {
    for (const form of forms) {
      const { name, configOf } =
        typeof form === 'string' ? presetOf(form) : form;
      test(`${name} with Easing.${easingName}: ${routes}`, () => {
        const config = configOf(EASINGS[easingName]);
        expect(SIZES.map((size) => routeOf(config, size)).join('')).toBe(
          routes
        );
      });
    }
  }
});
