/** @type {import('react-native-worklets/plugin').PluginOptions} */
const workletsPluginOptions = {
  strictGlobal: true,
  // Uncomment the following to enable bundle mode.
  // bundleMode: true,
  // workletizableModules: ['axios'],
};

/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [require.resolve('worklets-plugin-oxc/babel'), workletsPluginOptions],
    [
      'module-resolver',
      {
        alias: {
          '@': '../common-app/src',
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    ],
  ],
};
