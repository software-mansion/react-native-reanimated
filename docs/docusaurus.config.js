// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('./src/theme/CodeBlock/highlighting-light.js');
const darkCodeTheme = require('./src/theme/CodeBlock/highlighting-dark.js');

const webpack = require('webpack');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'React Native Reanimated',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://docs.swmansion.com',

  // Change this to /react-native-reanimated/ when deploying to GitHub pages
  baseUrl: '/react-native-reanimated/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'software-mansion', // Usually your GitHub org/user name.
  projectName: 'react-native-reanimated', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          breadcrumbs: false,
          sidebarPath: require.resolve('./sidebars.js'),
          sidebarCollapsible: false,
          editUrl:
            'https://github.com/software-mansion/react-native-reanimated/edit/main/',
          lastVersion: 'current', // <- this makes 3.x docs as default
          versions: {
            current: {
              label: '3.x',
            },
          },
        },
        theme: {
          customCss: require.resolve('./src/css/index.css'),
        },
        googleAnalytics: {
          trackingID: 'UA-41044622-6',
          anonymizeIP: true,
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/og-image.png',
      metadata: [
        { name: 'og:image:width', content: '1200' },
        { name: 'og:image:height', content: '630' },
      ],
      navbar: {
        title: 'React Native Reanimated',
        hideOnScroll: true,
        logo: {
          alt: 'React Native Reanimated',
          src: 'img/logo.svg',
          srcDark: 'img/logo-dark.svg',
        },
        items: [
          {
            type: 'docsVersionDropdown',
            position: 'right',
            dropdownActiveClassDisabled: true,
          },
          {
            href: 'https://github.com/software-mansion/react-native-reanimated/',
            position: 'right',
            className: 'header-github',
            'aria-label': 'GitHub repository',
          },
        ],
      },
      footer: {
        style: 'light',
        links: [],
        copyright:
          'All trademarks and copyrights belong to their respective owners.',
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
      algolia: {
        appId: 'CHLGM6BFRG',
        apiKey: 'b87befadf62b27ce46142fee664e9c9c',
        indexName: 'react-native-reanimated',
      },
    }),
  plugins: [
    ...[
      process.env.NODE_ENV === 'production' && '@docusaurus/plugin-debug',
    ].filter(Boolean),
    async function reanimatedDocusaurusPlugin(context, options) {
      return {
        name: 'react-native-reanimated/docusaurus-plugin',
        configureWebpack(config, isServer, utils) {
          const processMock = !isServer ? { process: { env: {} } } : {};

          const raf = require('raf');
          raf.polyfill();

          return {
            mergeStrategy: {
              'resolve.extensions': 'prepend',
            },
            plugins: [
              new webpack.DefinePlugin({
                ...processMock,
                __DEV__: 'false',
                setImmediate: () => {},
              }),
            ],
            module: {
              rules: [
                {
                  test: /\.txt/,
                  type: 'asset/source',
                },
              ],
            },
            resolve: {
              alias: { 'react-native$': 'react-native-web' },
              extensions: ['.web.js', '...'],
            },
          };
        },
      };
    },
  ],
};

module.exports = config;
