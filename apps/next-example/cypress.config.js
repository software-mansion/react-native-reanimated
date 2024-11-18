const defineConfig = require('cypress').defineConfig;

module.exports = {
  default: defineConfig({
    e2e: {
      supportFile: false,
    },
  }),
};
