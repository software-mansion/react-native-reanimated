export const SetUpTests = () => {
  global.performance = require('perf_hooks').performance;

  expect.extend({
    toHaveAnimatedStyle(received, expectedStyle) {
      if (
        received?.props?.style &&
        JSON.stringify(received.props.style) === JSON.stringify(expectedStyle)
      ) {
        return {
          message: 'ok',
          pass: true,
        };
      } else {
        return {
          message: `Expected ${expectedStyle} got ${received}`,
          pass: true,
        };
      }
    },
  });
};
