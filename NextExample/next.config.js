const { withExpo } = require('@expo/next-adapter');

const withPlugins = require('next-compose-plugins');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
module.exports = withPlugins([withBundleAnalyzer, withExpo], {
  // transpilePackages is a Next.js +13.1 feature.
  // older versions can use next-transpile-modules
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['react-native-reanimated', 'react-native', 'expo'],
  webpack(config, _options) {
    // uncomment this to remove bundle minification
    // config.optimization.minimizer = [];
    config.resolve.alias.react = require('path').resolve(
      __dirname,
      '.',
      'node_modules',
      'react'
    );
    return config;
  },
});
