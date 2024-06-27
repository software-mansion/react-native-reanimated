const stylexPlugin = require('@stylexjs/babel-plugin');
const rsdPlugin = require('react-strict-dom/babel');

module.exports = function (api) {
  api.cache(true);
  return {
    plugins: [
      rsdPlugin,
      [
        stylexPlugin,
        {
          importSources: [
            '@stylexjs/stylex',
            { from: 'react-strict-dom', as: 'css' },
          ],
          runtimeInjection: true,
        },
      ],
      'react-native-reanimated/plugin',
    ],
    presets: ['babel-preset-expo'],
  };
};
