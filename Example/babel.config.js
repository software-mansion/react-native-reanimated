module.exports = (api) => {
  const isWeb = api.caller(isTargetWeb);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-modules-commonjs',
      '../plugin',
      isWeb
        ? [
            'module-resolver',
            {
              alias: {
                'react-native-reanimated': './Animated/',
              },
            },
          ]
        : [
            'module-resolver',
            {
              alias: {
                'react-native-reanimated': '../src/Animated',
                react: './node_modules/react',
                'react-native': './node_modules/react-native',
                '@babel': './node_modules/@babel',
                fbjs: './node_modules/fbjs',
                'hoist-non-react-statics':
                  './node_modules/hoist-non-react-statics',
                invariant: './node_modules/invariant',
                'prop-types': './node_modules/prop-types',
              },
            },
          ],
    ].filter(Boolean),
  };
};

function isTargetWeb(caller) {
  return caller && caller.name === 'babel-loader';
}
