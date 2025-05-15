// @ts-expect-error: No types for Bob's babel preset.
const bobBabelDefaultsFactory = require('react-native-builder-bob/babel-preset');

const bobDefaults = bobBabelDefaultsFactory(
  undefined, // unused
  {
    supportsStaticESM: true,
    rewriteImportExtensions: false,
    jsxRuntime: 'automatic',
  },
  process.cwd()
);

const filteredPresets = bobDefaults.presets.filter(
  (/** @type {(string | string[])[]} */ preset) => {
    return !preset[0].includes('@babel/preset-react');
  }
);

/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: filteredPresets,
  plugins: bobDefaults.plugins,
};
