module.exports = function (api) {
  const disableBabelPreset = process.env.DISABLE_BABEL_PRESET === '1';
  // https://babeljs.io/docs/en/config-files#apicache
  api.cache.invalidate(() => disableBabelPreset);
  if (disableBabelPreset) {
    console.log('Starting Web example without Babel preset.');
  }
  return {
    presets: [
      !disableBabelPreset && 'react-native-reanimated/preset',
      'babel-preset-expo',
    ].filter(Boolean),
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.js', '.ts', '.tsx'],
          alias: {
            react: './node_modules/react',
            'react-native': './node_modules/react-native-web',
            'react-native-reanimated': '../src/index',
          },
        },
      ],
      '@babel/plugin-proposal-export-namespace-from',
    ],
  };
};
