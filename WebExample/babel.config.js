module.exports = function (api) {
  const disableBabelPlugin = process.env.DISABLE_BABEL_PLUGIN === '1';
  // https://babeljs.io/docs/en/config-files#apicache
  api.cache.invalidate(() => disableBabelPlugin);
  if (disableBabelPlugin) {
    console.log('Starting Web example without Babel plugin.');
  }
  return {
    presets: ['babel-preset-expo'],
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
      !disableBabelPlugin && ['react-native-reanimated/plugin', {isWeb: true}],
    ].filter(Boolean),
  };
};
