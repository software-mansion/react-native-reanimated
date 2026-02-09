// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('./src/theme/CodeBlock/highlighting-light.js');
const darkCodeTheme = require('./src/theme/CodeBlock/highlighting-dark.js');

const webpack = require('webpack');
const path = require('path');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title:
    'React Native Worklets: Multithreading engine for your apps and libraries',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://docs.swmansion.com',

  baseUrl: '/react-native-worklets/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'software-mansion', // Usually your GitHub org/user name.
  projectName: 'react-native-worklets', // Usually your repo name.

  scripts: [],

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: { defaultLocale: 'en', locales: ['en'] },

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
            'https://github.com/software-mansion/react-native-reanimated/edit/main/docs/docs-worklets',
          versions: { current: { label: '0.x' } },
        },
        theme: { customCss: require.resolve('./src/css/index.css') },
      }),
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/og-image.png',
      colorMode: { respectPrefersColorScheme: true },
      metadata: [
        { name: 'og:image:width', content: '1200' },
        { name: 'og:image:height', content: '630' },
      ],
      navbar: {
        title: 'React Native Worklets',
        hideOnScroll: true,
        logo: {
          alt: 'React Native Worklets',
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
            href: 'https://github.com/software-mansion/react-native-reanimated/tree/main/packages/react-native-worklets',
            position: 'right',
            className: 'header-github',
            'aria-label': 'GitHub repository',
          },
        ],
      },
      // App.js 2025 Banner
      announcementBar: {
        id: 'appjs-2025',
        content: ' ',
        backgroundColor: '#f7eded',
        textColor: '#484dfc',
      },
      footer: {
        style: 'light',
        links: [],
        copyright:
          'All trademarks and copyrights belong to their respective owners.',
      },
      prism: {
        additionalLanguages: ['bash', 'diff', 'json', 'mermaid'],
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
      algolia: {
        appId: 'HTRBY5HZ15',
        apiKey: '93f840a25edfcf77d2af4a5f2b386214',
        indexName: 'react-native-worklets',
        contextualSearch: false,
      },
    }),
  plugins: [
    ...[
      process.env.NODE_ENV === 'production' && '@docusaurus/plugin-debug',
      process.env.NODE_ENV === 'production' && [
        '@docusaurus/plugin-google-tag-manager',
        {
          containerId: 'GTM-KHX5NRM8',
        },
      ],
    ].filter(Boolean),
    function svgModulePlugin() {
      return {
        name: 'svg-module-plugin',
        configureWebpack(config, isServer, utils) {
          return {
            module: {
              rules: [
                {
                  test: /\.js?$/,
                  include: [
                    path.resolve(
                      __dirname,
                      'node_modules/@react-native/assets-registry/registry'
                    ),
                  ],
                  use: {
                    loader: require.resolve('babel-loader'),
                    options: {
                      babelrc: false,
                      configFile: false,
                      presets: [require.resolve('@babel/preset-flow')],
                    },
                  },
                },
              ],
            },
          };
        },
      };
    },
    async function reanimatedDocusaurusPlugin(context, options) {
      return {
        name: 'react-native-worklets/docusaurus-plugin',
        configureWebpack(config, isServer, utils) {
          const processMock = !isServer ? { process: { env: {} } } : {};

          const raf = require('raf');
          raf.polyfill();

          return {
            mergeStrategy: { 'resolve.extensions': 'prepend' },
            plugins: [
              new webpack.DefinePlugin({ ...processMock, __DEV__: 'false' }),
            ],
            module: {
              rules: [
                { test: /\.txt$/, type: 'asset/source' },
                { test: /\.tsx?$/, use: 'babel-loader' },
                { test: /\.js$/, use: 'babel-loader' },
              ],
            },
            resolve: {
              alias: { 'react-native$': 'react-native-web' },
              extensions: ['.web.js', '...'],
            },
            ignoreWarnings: [
              (error) => {
                /*
                 * Ignore warning we can't fix:
                 * "moduleName":"./node_modules/typescript/lib/typescript.js","loc":"50:2440-2459","message":"Critical dependency: the request of a dependency is an expression"
                 */
                if (
                  error.message.includes(
                    'Critical dependency: the request of a dependency is an expression'
                  ) &&
                  // @ts-expect-error Not exposed type.
                  error?.module?.context?.includes('typescript/lib')
                ) {
                  return true;
                }
                return false;
              },
            ],
          };
        },
      };
    },
  ],
};

module.exports = config;
