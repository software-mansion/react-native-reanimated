const { withExpo } = require('@expo/next-adapter');

const withPlugins = require('next-compose-plugins');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE_BUNDLE === '1',
});

// this can be used to obtain a more readable bundle for debugging
const disableMinification = process.env.DISABLE_MINIFICATION === '1';

/** @type {import('next').NextConfig} */
module.exports = withPlugins([withBundleAnalyzer, withExpo], {
  // transpilePackages is a Next.js +13.1 feature.
  // older versions can use next-transpile-modules
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['react-native-reanimated', 'react-native', 'expo', 'react-native-worklets'],
  webpack(config) {
    if (disableMinification) {
      config.optimization.minimizer = [];
    }
    config.resolve.alias.react = require('path').resolve(
      __dirname,
      '..',
      '..',
      'node_modules',
      'react'
    );
    return config;
  },
});
