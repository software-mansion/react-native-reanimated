const { withExpo } = require('@expo/next-adapter');

/** @type {import('next').NextConfig} */
module.exports = withExpo({
  // transpilePackages is a Next.js +13.1 feature.
  // older versions can use next-transpile-modules
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['react-native-reanimated', 'react-native', 'expo'],
  // webpack(config, _options) {
  //   config.resolve.alias = {
  //     ...config.resolve.alias,
  //     'react-native-reanimated': require('path').resolve(
  //       __dirname,
  //       '../lib/commonjs/index.js'
  //     ),
  //   };
  //   return config;
  // },
});
