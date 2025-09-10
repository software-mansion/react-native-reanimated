/* eslint-disable @typescript-eslint/no-namespace */
'use strict';

import { IS_JEST, logger, ReanimatedError } from "./common/index.js";
const defaultFramerateConfig = {
  fps: 60
};
const isEmpty = obj => !obj || Object.keys(obj).length === 0;
const getStylesFromObject = obj => {
  return obj === undefined ? {} : Object.fromEntries(Object.entries(obj).map(([property, value]) => [property, value._isReanimatedSharedValue ? value.value : value]));
};
const getCurrentProps = component => {
  const propsObject = component.props.jestAnimatedProps?.value;
  return propsObject ? {
    ...propsObject
  } : {};
};
const getCurrentStyle = component => {
  const styleObject = component.props.style;
  let currentStyle = {};
  if (Array.isArray(styleObject)) {
    // It is possible that style may contain nested arrays. Currently, neither `StyleSheet.flatten` nor `flattenArray` solve this issue.
    // Hence, we're not handling nested arrays at the moment - this is a known limitation of the current implementation.
    styleObject.forEach(style => {
      currentStyle = {
        ...currentStyle,
        ...style
      };
    });
  }
  const jestInlineStyles = component.props.jestInlineStyle;
  const jestAnimatedStyleValue = component.props.jestAnimatedStyle?.value;
  if (Array.isArray(jestInlineStyles)) {
    for (const obj of jestInlineStyles) {
      if ('jestAnimatedValues' in obj) {
        continue;
      }
      const inlineStyles = getStylesFromObject(obj);
      currentStyle = {
        ...currentStyle,
        ...inlineStyles
      };
    }
    currentStyle = {
      ...currentStyle,
      ...jestAnimatedStyleValue
    };
    return currentStyle;
  }
  const inlineStyles = getStylesFromObject(jestInlineStyles);
  currentStyle = isEmpty(jestAnimatedStyleValue) ? {
    ...inlineStyles
  } : {
    ...jestAnimatedStyleValue
  };
  return currentStyle;
};
const checkEqual = (current, expected) => {
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
const findStyleDiff = (current, expected, shouldMatchAllProps) => {
  const diffs = [];
  let isEqual = true;
  let property;
  for (property in expected) {
    if (!checkEqual(current[property], expected[property])) {
      isEqual = false;
      diffs.push({
        property,
        current: current[property],
        expect: expected[property]
      });
    }
  }
  if (shouldMatchAllProps && Object.keys(current).length !== Object.keys(expected).length) {
    isEqual = false;
    // eslint-disable-next-line @typescript-eslint/no-shadow
    let property;
    for (property in current) {
      if (expected[property] === undefined) {
        diffs.push({
          property,
          current: current[property],
          expect: expected[property]
        });
      }
    }
  }
  return {
    isEqual,
    diffs
  };
};
const compareAndFormatDifferences = (currentValues, expectedValues, shouldMatchAllProps = false) => {
  const {
    isEqual,
    diffs
  } = findStyleDiff(currentValues, expectedValues, shouldMatchAllProps);
  if (isEqual) {
    return {
      message: () => 'ok',
      pass: true
    };
  }
  const currentValuesStr = JSON.stringify(currentValues);
  const expectedValuesStr = JSON.stringify(expectedValues);
  const differences = diffs.map(diff => `- '${diff.property}' should be ${JSON.stringify(diff.expect)}, but is ${JSON.stringify(diff.current)}`).join('\n');
  return {
    message: () => `Expected: ${expectedValuesStr}\nReceived: ${currentValuesStr}\n\nDifferences:\n${differences}`,
    pass: false
  };
};
const compareProps = (component, expectedProps) => {
  if (component.props.jestAnimatedProps && Object.keys(component.props.jestAnimatedProps.value).length === 0) {
    return {
      message: () => `Component doesn't have props.`,
      pass: false
    };
  }
  const currentProps = getCurrentProps(component);
  return compareAndFormatDifferences(currentProps, expectedProps);
};
const compareStyle = (component, expectedStyle, config) => {
  if (!component.props.style) {
    return {
      message: () => `Component doesn't have a style.`,
      pass: false
    };
  }
  const {
    shouldMatchAllProps
  } = config;
  const currentStyle = getCurrentStyle(component);
  return compareAndFormatDifferences(currentStyle, expectedStyle, shouldMatchAllProps);
};
let frameTime = Math.round(1000 / defaultFramerateConfig.fps);
const beforeTest = () => {
  jest.useFakeTimers();
};
const afterTest = () => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
};
export const withReanimatedTimer = animationTest => {
  logger.warn('This method is deprecated, you should define your own before and after test hooks to enable jest.useFakeTimers(). Check out the documentation for details on testing');
  beforeTest();
  animationTest();
  afterTest();
};
export const advanceAnimationByTime = (time = frameTime) => {
  logger.warn('This method is deprecated, use jest.advanceTimersByTime directly');
  jest.advanceTimersByTime(time);
  jest.runOnlyPendingTimers();
};
export const advanceAnimationByFrame = count => {
  logger.warn('This method is deprecated, use jest.advanceTimersByTime directly');
  jest.advanceTimersByTime(count * frameTime);
  jest.runOnlyPendingTimers();
};
const requireFunction = IS_JEST ? require : () => {
  throw new ReanimatedError('`setUpTests` is available only in Jest environment.');
};
export const setUpTests = (userFramerateConfig = {}) => {
  let expect = global.expect;
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
    ...userFramerateConfig
  };
  frameTime = Math.round(1000 / framerateConfig.fps);
  expect.extend({
    toHaveAnimatedProps(component, expectedProps) {
      return compareProps(component, expectedProps);
    }
  });
  expect.extend({
    toHaveAnimatedStyle(component, expectedStyle, config = {}) {
      return compareStyle(component, expectedStyle, config);
    }
  });
};
export const getAnimatedStyle = component => {
  return getCurrentStyle(
  // This type assertion is needed to get type checking in the following
  // functions since `ReactTestInstance` has its `props` defined as `any`.
  component);
};
//# sourceMappingURL=jestUtils.js.map