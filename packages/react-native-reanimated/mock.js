const Reanimated = require('./src/mock');
// @ts-expect-error
const Animated = Reanimated.default;

module.exports = {
  ...Reanimated,

  default: {
    ...Animated,
  },
};
