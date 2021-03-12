// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
const MockDate = require('mockdate');

let config = {
  fps: 60,
};

const checkValidation = (received) => {
  let message = [];
  let isValid = true;
  if (!received.props.style) {
    isValid = false;
    message.push("Component not contains 'style' property");
  }
  if (!received.props.animatedStyle?.value) {
    isValid = false;
    message.push("Component not contains 'animatedStyle' property");
  }
  message = message.join('\n');

  return { isValid, message };
};

const getCurrentStyle = (received) => {
  return {
    ...received.props.style,
    ...received.props.animatedStyle.value,
  };
};

const findStyleDiff = (current, expect, requireAllMatch) => {
  const diffs = [];
  let isEqual = true;
  for (const property in expect) {
    if (current[property] !== expect[property]) {
      isEqual = false;
      diffs.push({
        property: property,
        current: current[property],
        expect: expect[property],
      });
    }
  }
  if (
    requireAllMatch &&
    Object.keys(current).length !== Object.keys(expect).length
  ) {
    isEqual = false;
    for (const property in current) {
      if (expect[property] === undefined) {
        diffs.push({
          property: property,
          current: current[property],
          expect: expect[property],
        });
      }
    }
  }

  return { isEqual, diffs };
};

const compareStyle = (received, expectedStyle, config) => {
  const { isValid, message } = checkValidation(received);
  if (!isValid) {
    return { message: () => message, pass: false };
  }
  const { exact } = config;
  const currentStyle = getCurrentStyle(received);
  const { isEqual, diffs } = findStyleDiff(currentStyle, expectedStyle, exact);

  if (isEqual) {
    return { message: () => 'ok', pass: true };
  }

  const currentStyleStr = JSON.stringify(currentStyle);
  const expectedStyleStr = JSON.stringify(expectedStyle);
  const differences = diffs
    .map(
      (diff) =>
        `- '${diff.property}' should be ${diff.expect}, but is ${diff.current}`
    )
    .join('\n');

  return {
    message: () =>
      `Expected: ${expectedStyleStr}\nReceived: ${currentStyleStr}\n\nDifferences:\n${differences}`,
    pass: false,
  };
};

let frameTime = 1000 / config.fps;
let requestAnimationFrameCopy;

const requestAnimationFrame = (callback) => {
  setTimeout(callback, frameTime);
};

const beforeTest = () => {
  requestAnimationFrameCopy = global.requestAnimationFrame;
  global.requestAnimationFrame = requestAnimationFrame;
  MockDate.set(0);
  jest.useFakeTimers();
};

const afterTest = () => {
  MockDate.reset();
  jest.useRealTimers();
  global.requestAnimationFrame = requestAnimationFrameCopy;
};

const tickTravel = () => {
  MockDate.set(new Date(Date.now() + frameTime));
  jest.advanceTimersByTime(frameTime);
};

export const withReanimatedTimer = (animatonTest) => {
  beforeTest();
  animatonTest();
  afterTest();
};

export const advanceAnimationByTime = (time = frameTime) => {
  for (let i = 0; i < Math.ceil(time / frameTime); i++) {
    tickTravel();
  }
};

export const advanceAnimationByFrame = (count) => {
  for (let i = 0; i < count; i++) {
    tickTravel();
  }
};

export const setUpTests = (userConfig = {}) => {
  const expect = require('expect');
  frameTime = 1000 / config.fps;

  config = {
    ...config,
    ...userConfig,
  };

  expect.extend({
    toHaveAnimatedStyle(received, expectedStyle, config = {}) {
      return compareStyle(received, expectedStyle, config);
    },
  });

  jest.mock('./js-reanimated', () => require('./js-reanimated/index.web'));
  jest.mock('../ReanimatedModule', () => require('../ReanimatedModuleCompat'));
  jest.mock('./NativeReanimated', () => {
    let module;
    try {
      module = require('./NativeReanimated.js');
    } catch {
      module = require('./NativeReanimated.ts');
    }
    return module.default;
  });
};

export const getAnimatedStyle = (received) => {
  return getCurrentStyle(received);
};
