/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  plugins: [
    ['react-native-reanimated/plugin', { processNestedWorklets: true }],
    '@babel/plugin-transform-export-namespace-from',
    [
      'module-resolver',
      {
        // This needs to be mirrored in ../tsconfig.json
        alias: {
          '@': './src',
        },
        extensions: ['.ts', '.tsx', '.svg', '.json'],
        root: ['./'],
      },
    ],
  ],
  presets: ['module:@react-native/babel-preset'],
};
