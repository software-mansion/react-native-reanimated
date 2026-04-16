const Reanimated = require('./src/mock');
const SVG = require('./src/mock-svg');
// @ts-expect-error
const Animated = Reanimated.default;

module.exports = {
  ...Reanimated,
  ...SVG,

  default: { ...Animated },
};
