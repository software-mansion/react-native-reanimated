module.exports = api => {
  api.cache(false);
  return {
    presets: ['module:metro-react-native-babel-preset'],
    plugins: [
      '@babel/plugin-transform-modules-commonjs',
      [
        'module-resolver',
        {
          alias: {
            'react-native-reanimated': '../src/Animated',
            react: './node_modules/react',
            'react-native': './node_modules/react-native',
            '@babel': './node_modules/@babel',
            fbjs: './node_modules/fbjs',
            'hoist-non-react-statics': './node_modules/hoist-non-react-statics',
            invariant: './node_modules/invariant',
            'prop-types': './node_modules/prop-types',
          },
        },
      ],
    ],
  };
};
