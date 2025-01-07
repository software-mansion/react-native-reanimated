/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['react-native-reanimated/plugin', { processNestedWorklets: true }],
    [
      'module-resolver',
      {
        alias: {
          '@': '../common-app/src',
          '~': '../common-app/src/features',
        },
        extensions: ['.ts', '.tsx', '.svg', '.json'],
      },
    ],
  ],
};
