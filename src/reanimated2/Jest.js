export let withReanimatedTimer;
export let moveAnimationByTime;
export let moveAnimationByFrame;

export const SetUpTests = (userConfig = {}) => {
  const expect = require('expect');
  const config = {
    fps: 60,
    ...userConfig,
  };

  global.performance = {
    now: () => Date.now(),
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
    if (requireAllMatch) {
      if (Object.keys(current).length !== Object.keys(expect).length) {
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
    }

    return { isEqual, diffs };
  };

  const compareStyle = (received, expectedStyle, requireAllMatch = false) => {
    const { isValid, message } = checkValidation(received);
    if (!isValid) {
      return { message: () => message, pass: false };
    }
    const currentStyle = getCurrentStyle(received);
    const { isEqual, diffs } = findStyleDiff(
      currentStyle,
      expectedStyle,
      requireAllMatch
    );

    if (isEqual) {
      return { message: () => 'ok', pass: true };
    } else {
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
    }
  };

  expect.extend({
    toHaveAnimatedStyle(received, expectedStyle) {
      return compareStyle(received, expectedStyle);
    },

    toHaveEqualAnimatedStyle(received, expectedStyle) {
      return compareStyle(received, expectedStyle, true);
    },
  });

  const setUpReanimatedTimer = () => {
    const MockDate = require('mockdate');
    const frameTime = 1000 / config.fps;
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

    withReanimatedTimer = (animatonTest) => {
      beforeTest();
      animatonTest();
      afterTest();
    };

    moveAnimationByTime = (time = frameTime) => {
      for (let i = 0; i < Math.ceil(time / frameTime); i++) {
        tickTravel();
      }
    };

    moveAnimationByFrame = (count) => {
      for (let i = 0; i < count; i++) {
        tickTravel();
      }
    };
  };

  setUpReanimatedTimer();
};
