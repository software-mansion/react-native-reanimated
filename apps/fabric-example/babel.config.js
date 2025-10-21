/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'react-native-worklets/plugin',
      {
        // Uncomment the next line to enable bundle mode.
        bundleMode: true,
        workletizableModules: ['react-native/Libraries/Core/setUpXHR', 'axios'],
      },
    ],
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

// workletizableModules: ['react-native/Libraries/Core/setUpXHR', 'axios'],
