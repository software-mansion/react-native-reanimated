const { withExpo } = require('@expo/next-adapter');

/** @type {import('next').NextConfig} */
module.exports = withExpo({
  // transpilePackages is a Next.js +13.1 feature.
  // older versions can use next-transpile-modules
  transpilePackages: ['react-native-reanimated', 'react-native', 'expo'],
});
