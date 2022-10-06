// @ts-check

const enabled = process.env.ANALYZE === 'true'

if (enabled) {
  console.log('[next-config] Analyzing bundle size...')
}

const withNextBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled,
})

const withTM = require('next-transpile-modules')(['react-native-reanimated'])

const compose = require('next-compose-plugins')

const { withExpo } = require('@expo/next-adapter')

module.exports = compose(
  [withTM, withNextBundleAnalyzer, [withExpo, { projectRoot: __dirname }]],
  /** @type {import('next').NextConfig} */
  {
    webpack5: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
    webpack(config, _options) {
      // config.resolve.alias = {
      //   ...config.resolve.alias,
      //   'react-native-reanimated': require('path').resolve(
      //     __dirname,
      //     'lib/react-native-reanimated/src/index.js'
      //   ),
      // }

      return config
    },
  }
)
