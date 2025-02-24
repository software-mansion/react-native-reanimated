/* eslint-disable @typescript-eslint/no-namespace */
'use strict';

import type { ReactTestInstance } from 'react-test-renderer';

import type {
  AnimatedComponentProps,
  IAnimatedComponentInternal,
  InitialComponentProps,
} from './createAnimatedComponent/commonTypes';
import { ReanimatedError } from './errors';
import type { DefaultStyle } from './hook/commonTypes';
import { isJest } from './PlatformChecker';

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveAnimatedStyle(
        style: Record<string, unknown>[] | Record<string, unknown>,
        config?: {
          shouldMatchAllProps?: boolean;
        }
      ): R;
    }
  }
}

const defaultFramerateConfig = {
  fps: 60,
};

const isEmpty = (obj: object | undefined) =>
  !obj || Object.keys(obj).length === 0;
const getStylesFromObject = (obj: object) => {
  return obj === undefined
    ? {}
    : Object.fromEntries(
        Object.entries(obj).map(([property, value]) => [
          property,
          value._isReanimatedSharedValue ? value.value : value,
        ])
      );
};

type StyleValue = { value: unknown };
type JestInlineStyle =
  | {
      [s: string]: StyleValue;
    }
  | ArrayLike<StyleValue>;

const getCurrentStyle = (component: TestComponent): DefaultStyle => {
  const styleObject = component.props.style;

  let currentStyle = {};

  if (Array.isArray(styleObject)) {
    // It is possible that style may contain nested arrays. Currently, neither `StyleSheet.flatten` nor `flattenArray` solve this issue.
    // Hence, we're not handling nested arrays at the moment - this is a known limitation of the current implementation.
    styleObject.forEach((style) => {
      currentStyle = {
        ...currentStyle,
        ...style,
      };
    });

    return currentStyle;
  }

  const jestInlineStyles = component.props.jestInlineStyle as JestInlineStyle;
  const jestAnimatedStyleValue = component.props.jestAnimatedStyle?.value;

  if (Array.isArray(jestInlineStyles)) {
    for (const obj of jestInlineStyles) {
      if ('jestAnimatedStyle' in obj) {
        continue;
      }

      const inlineStyles = getStylesFromObject(obj);

      currentStyle = {
        ...currentStyle,
        ...inlineStyles,
      };
    }

    currentStyle = {
      ...styleObject,
      ...currentStyle,
      ...jestAnimatedStyleValue,
    };

    return currentStyle;
  }

  const inlineStyles = getStylesFromObject(jestInlineStyles);

  currentStyle = isEmpty(jestAnimatedStyleValue as object | undefined)
    ? { ...styleObject, ...inlineStyles }
    : { ...styleObject, ...jestAnimatedStyleValue };

  return currentStyle;
};

const checkEqual = <Value>(current: Value, expected: Value) => {
  if (Array.isArray(expected)) {
    if (!Array.isArray(current) || expected.length !== current.length) {
      return false;
    }
    for (let i = 0; i < current.length; i++) {
      if (!checkEqual(current[i], expected[i])) {
        return false;
      }
    }
  } else if (typeof current === 'object' && current) {
    if (typeof expected !== 'object' || !expected) {
      return false;
    }
    for (const property in expected) {
      if (!checkEqual(current[property], expected[property])) {
        return false;
      }
    }
  } else {
    return current === expected;
  }
  return true;
};

const findStyleDiff = (
  current: DefaultStyle,
  expected: DefaultStyle,
  shouldMatchAllProps?: boolean
) => {
  const diffs = [];
  let isEqual = true;
  let property: keyof DefaultStyle;
  for (property in expected) {
    if (!checkEqual(current[property], expected[property])) {
      isEqual = false;
      diffs.push({
        property,
        current: current[property],
        expect: expected[property],
      });
    }
  }

  if (
    shouldMatchAllProps &&
    Object.keys(current).length !== Object.keys(expected).length
  ) {
    isEqual = false;
    // eslint-disable-next-line @typescript-eslint/no-shadow
    let property: keyof DefaultStyle;
    for (property in current) {
      if (expected[property] === undefined) {
        diffs.push({
          property,
          current: current[property],
          expect: expected[property],
        });
      }
    }
  }

  return { isEqual, diffs };
};

const compareStyle = (
  component: TestComponent,
  expectedStyle: DefaultStyle,
  config: ToHaveAnimatedStyleConfig
) => {
  if (!component.props.style) {
    return { message: () => `Component doesn't have a style.`, pass: false };
  }
  const { shouldMatchAllProps } = config;
  const currentStyle = getCurrentStyle(component);
  const { isEqual, diffs } = findStyleDiff(
    currentStyle,
    expectedStyle,
    shouldMatchAllProps
  );

  if (isEqual) {
    return { message: () => 'ok', pass: true };
  }

  const currentStyleStr = JSON.stringify(currentStyle);
  const expectedStyleStr = JSON.stringify(expectedStyle);
  const differences = diffs
    .map(
      (diff) =>
        `- '${diff.property}' should be ${JSON.stringify(
          diff.expect
        )}, but is ${JSON.stringify(diff.current)}`
    )
    .join('\n');

  return {
    message: () =>
      `Expected: ${expectedStyleStr}\nReceived: ${currentStyleStr}\n\nDifferences:\n${differences}`,
    pass: false,
  };
};

let frameTime = Math.round(1000 / defaultFramerateConfig.fps);

const beforeTest = () => {
  jest.useFakeTimers();
};

const afterTest = () => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
};

export const withReanimatedTimer = (animationTest: () => void) => {
  console.warn(
    'This method is deprecated, you should define your own before and after test hooks to enable jest.useFakeTimers(). Check out the documentation for details on testing'
  );
  beforeTest();
  animationTest();
  afterTest();
};

export const advanceAnimationByTime = (time = frameTime) => {
  console.warn(
    'This method is deprecated, use jest.advanceTimersByTime directly'
  );
  jest.advanceTimersByTime(time);
  jest.runOnlyPendingTimers();
};

export const advanceAnimationByFrame = (count: number) => {
  console.warn(
    'This method is deprecated, use jest.advanceTimersByTime directly'
  );
  jest.advanceTimersByTime(count * frameTime);
  jest.runOnlyPendingTimers();
};

const requireFunction = isJest()
  ? require
  : () => {
      throw new ReanimatedError(
        '`setUpTests` is available only in Jest environment.'
      );
    };

type ToHaveAnimatedStyleConfig = {
  shouldMatchAllProps?: boolean;
};

export const setUpTests = (userFramerateConfig = {}) => {
  let expect: jest.Expect = (global as typeof global & { expect: jest.Expect })
    .expect;
  if (expect === undefined) {
    const expectModule = requireFunction('expect');
    expect = expectModule;
    // Starting from Jest 28, "expect" package uses named exports instead of default export.
    // So, requiring "expect" package doesn't give direct access to "expect" function anymore.
    // It gives access to the module object instead.
    // We use this info to detect if the project uses Jest 28 or higher.
    if (typeof expect === 'object') {
      const jestGlobals = requireFunction('@jest/globals');
      expect = jestGlobals.expect;
    }
    if (expect === undefined || expect.extend === undefined) {
      expect = expectModule.default;
    }
  }

  const framerateConfig = {
    ...defaultFramerateConfig,
    ...userFramerateConfig,
  };
  frameTime = Math.round(1000 / framerateConfig.fps);

  expect.extend({
    toHaveAnimatedStyle(
      component: React.Component<
        AnimatedComponentProps<InitialComponentProps>
      > &
        IAnimatedComponentInternal,
      expectedStyle: DefaultStyle,
      config: ToHaveAnimatedStyleConfig = {}
    ) {
      return compareStyle(component, expectedStyle, config);
    },
  });
};

type TestComponent = React.Component<
  AnimatedComponentProps<InitialComponentProps> & {
    jestAnimatedStyle?: { value: DefaultStyle };
  }
>;

export const getAnimatedStyle = (component: ReactTestInstance) => {
  return getCurrentStyle(
    // This type assertion is needed to get type checking in the following
    // functions since `ReactTestInstance` has its `props` defined as `any`.
    component as unknown as TestComponent
  );
};
