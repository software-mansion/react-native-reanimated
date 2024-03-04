const Reanimated = require('./src/mock');
const Animated = Reanimated.default;

module.exports = {
  ...Reanimated,

  default: {
    ...Animated,
  },
};
