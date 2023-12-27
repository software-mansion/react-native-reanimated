/* eslint-disable @typescript-eslint/no-namespace */
'use strict';

import type {
  AnimatedComponentProps,
  InitialComponentProps,
} from 'src/createAnimatedComponent/commonTypes';
import { isJest } from './PlatformChecker';
import type { DefaultStyle } from './hook/commonTypes';
import type { StyleProp } from 'react-native';

type AnimatedStyleJest = DefaultStyle & {
  animatedStyle: {
    current: {
      value: Record<string, unknown>;
    };
  };
};

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

let config = {
  fps: 60,
};

const isAnimatedStyle = (style: unknown): boolean => {
  return !!(style as AnimatedStyleJest).animatedStyle;
};

const getAnimatedStyleFromObject = (
  style: AnimatedStyleJest
): Record<string, unknown> => {
  return style.animatedStyle.current.value;
};

const getCurrentStyle = (
  received: React.Component<AnimatedComponentProps<InitialComponentProps>>
) => {
  const styleObject = received.props.style;
  let currentStyle = {};
  if (Array.isArray(styleObject)) {
    styleObject.forEach((style) => {
      if (isAnimatedStyle(style)) {
        currentStyle = {
          ...currentStyle,
          ...getAnimatedStyleFromObject(style as AnimatedStyleJest),
        };
      } else {
        currentStyle = {
          ...currentStyle,
          ...style,
        };
      }
    });
  } else {
    if (isAnimatedStyle(styleObject)) {
      currentStyle = getAnimatedStyleFromObject(
        styleObject as AnimatedStyleJest
      );
    } else {
      currentStyle = {
        ...styleObject,
        ...received.props.animatedStyle?.value,
      };
    }
  }
  return currentStyle;
};

const checkEqual = (
  currentStyle: StyleProp<DefaultStyle>,
  expectStyle: StyleProp<DefaultStyle>
) => {
  if (Array.isArray(expectStyle)) {
    if (
      !Array.isArray(currentStyle) ||
      expectStyle.length !== currentStyle.length
    ) {
      return false;
    }
    for (let i = 0; i < currentStyle.length; i++) {
      if (
        !checkEqual(
          currentStyle[i] as StyleProp<DefaultStyle>,
          expectStyle[i] as StyleProp<DefaultStyle>
        )
      ) {
        return false;
      }
    }
  } else if (typeof currentStyle === 'object' && currentStyle) {
    if (typeof expectStyle !== 'object' || !expectStyle) {
      return false;
    }
    let property: keyof typeof expectStyle;
    for (property in expectStyle) {
      if (
        !checkEqual(
          currentStyle[
            property as keyof typeof currentStyle
          ] as StyleProp<DefaultStyle>,
          expectStyle[property] as StyleProp<DefaultStyle>
        )
      ) {
        return false;
      }
    }
  } else {
    return currentStyle === expectStyle;
  }
  return true;
};

const findStyleDiff = (
  current: AnimatedStyleJest,
  expect: AnimatedStyleJest,
  shouldMatchAllProps: boolean
) => {
  const diffs = [];
  let isEqual = true;
  let property: keyof typeof expect;
  for (property in expect) {
    if (
      !checkEqual(
        current[property] as StyleProp<DefaultStyle>,
        expect[property] as StyleProp<DefaultStyle>
      )
    ) {
      isEqual = false;
      diffs.push({
        property,
        current: current[property],
        expect: expect[property],
      });
    }
  }

  if (
    shouldMatchAllProps &&
    Object.keys(current).length !== Object.keys(expect).length
  ) {
    isEqual = false;
    let property: keyof typeof current;
    for (property in current) {
      if (expect[property] === undefined) {
        diffs.push({
          property,
          current: current[property],
          expect: expect[property],
        });
      }
    }
  }

  return { isEqual, diffs };
};

const compareStyle = (
  received: React.Component<AnimatedComponentProps<InitialComponentProps>>,
  expectedStyle: AnimatedStyleJest,
  config: { shouldMatchAllProps: boolean }
) => {
  if (!received.props.style) {
    return { message: () => 'unknown message', pass: false };
  }
  const { shouldMatchAllProps } = config;
  const currentStyle = getCurrentStyle(received);
  const { isEqual, diffs } = findStyleDiff(
    currentStyle as AnimatedStyleJest,
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

let frameTime = 1000 / config.fps;

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
      throw new Error(
        '[Reanimated] `setUpTests` is available only in Jest environment.'
      );
    };

export const setUpTests = (userConfig = {}) => {
  let expect = (global as typeof global & { expect: jest.Expect })
    .expect as jest.Expect;
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

  frameTime = Math.round(1000 / config.fps);

  config = {
    ...config,
    ...userConfig,
  };
  expect.extend({
    toHaveAnimatedStyle(
      received: React.Component<AnimatedComponentProps<InitialComponentProps>>,
      expectedStyle: AnimatedStyleJest,
      config = {}
    ) {
      return compareStyle(received, expectedStyle, config);
    },
  });
};

export const getAnimatedStyle = (
  received: React.Component<AnimatedComponentProps<InitialComponentProps>>
) => {
  return getCurrentStyle(received);
};
