// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('./src/theme/CodeBlock/highlighting-light.js');
const darkCodeTheme = require('./src/theme/CodeBlock/highlighting-dark.js');

const webpack = require('webpack');
const path = require('path');

const {
  topbarBannerReservationScript,
} = require('@swmansion/t-rex-ui/topbar-banner');
// @ts-expect-error -- .ts extension is intentional; not type-checked by tsc here.
const { TOP_BAR_BANNER } = require('./src/components/topbarBanner.config.ts');

const firstBannerZone = TOP_BAR_BANNER.zones[0];
const bannerReservationHeadTags = firstBannerZone
  ? [
      {
        tagName: 'script',
        attributes: { type: 'text/javascript' },
        innerHTML: topbarBannerReservationScript(
          firstBannerZone.zoneId,
          firstBannerZone.contentId,
          TOP_BAR_BANNER.hiddenPaths
        ),
      },
    ]
  : [];

const ORGANIZATION_ID = 'https://swmansion.com/#organization';

// Same @id as swmansion.com, so engines read one company across both domains.
const structuredDataHeadTag = {
  tagName: 'script',
  attributes: { type: 'application/ld+json' },
  innerHTML: JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: 'Software Mansion',
        url: 'https://swmansion.com',
        sameAs: [
          'https://github.com/software-mansion',
          'https://www.linkedin.com/company/software-mansion/',
          'https://twitter.com/swmansion',
          'https://www.youtube.com/c/SoftwareMansion',
        ],
      },
      {
        '@type': 'SoftwareSourceCode',
        name: 'React Native Reanimated',
        description:
          "React Native's Animated library reimplemented, with animations and gestures running on the UI thread.",
        codeRepository:
          'https://github.com/software-mansion/react-native-reanimated',
        programmingLanguage: ['TypeScript', 'C++'],
        runtimePlatform: 'React Native',
        license:
          'https://github.com/software-mansion/react-native-reanimated/blob/main/LICENSE',
        author: { '@id': ORGANIZATION_ID },
        maintainer: { '@id': ORGANIZATION_ID },
      },
    ],
  }).replace(/</g, '\\u003c'),
};

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'React Native Reanimated',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://docs.swmansion.com',

  // Change this to /react-native-reanimated/ when deploying to GitHub pages
  baseUrl: '/react-native-reanimated/',

  trailingSlash: true,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'software-mansion', // Usually your GitHub org/user name.
  projectName: 'react-native-reanimated', // Usually your repo name.

  headTags: [...bannerReservationHeadTags, structuredDataHeadTag],

  scripts: [
    {
      src: '/react-native-reanimated/js/snack-helpers.js',
      async: true,
    },
  ],

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
            'https://github.com/software-mansion/react-native-reanimated/edit/main/docs/docs-reanimated',
          lastVersion: 'current',
          versions: {
            current: {
              label: '4.x',
            },
          },
        },
        theme: {
          customCss: require.resolve('./src/css/index.css'),
        },
        blog: {
          routeBasePath: '/examples',
          blogSidebarTitle: 'Examples',
          blogSidebarCount: 'ALL',
          showReadingTime: false,
          onUntruncatedBlogPosts: 'ignore',
        },
      }),
    ],
    require.resolve('@swmansion/t-rex-ui/preset'),
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/og-image.png',
      colorMode: {
        respectPrefersColorScheme: true,
      },
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
            to: 'docs/fundamentals/getting-started',
            activeBasePath: 'docs',
            label: 'Docs',
            position: 'left',
          },
          { to: 'examples/accordion', label: 'Examples', position: 'left' },
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
        appId: 'CHLGM6BFRG',
        apiKey: 'b87befadf62b27ce46142fee664e9c9c',
        indexName: 'react-native-reanimated',
      },
    }),
  plugins: [
    ...[
      process.env.NODE_ENV === 'production' && '@docusaurus/plugin-debug',
      process.env.NODE_ENV === 'production' && [
        '@docusaurus/plugin-google-tag-manager',
        {
          containerId: 'GTM-PVLQ9XVM',
        },
      ],
    ].filter(Boolean),
    require('./plugins/llms-txt'),
    [
      '@docusaurus/plugin-client-redirects',
      /** @type {import('@docusaurus/plugin-client-redirects').Options} */
      ({
        redirects: [
          {
            from: [
              '/docs/',
              '/docs/installation',
              '/docs/fundamentals/installation',
              '/docs/next/installation',
              '/docs/next/fundamentals/installation',
              '/docs/about',
              '/docs/about-reanimated.html',
              '/docs/api',
            ],
            to: '/docs/fundamentals/getting-started',
          },
          {
            from: '/docs/1.x.x',
            to: '/docs/1.x',
          },
          {
            from: '/docs/1.x.x/getting_started',
            to: '/docs/1.x/getting_started',
          },
          {
            from: '/docs/next/animations',
            to: '/docs/category/animations',
          },
          {
            from: '/docs/fundamentals/web-support',
            to: '/docs/guides/web-support',
          },
          { from: '/docs/tutorials', to: '/docs/category/guides' },
          { from: '/docs/devtools', to: '/docs/category/debugging' },
          {
            from: [
              '/docs/api/hooks/useSharedValue',
              '/docs/next/api/hooks/useSharedValue',
              '/docs/fundamentals/shared-values',
              '/docs/shared-values',
            ],
            to: '/docs/core/useSharedValue',
          },
          {
            from: [
              '/docs/api/hooks/useAnimatedStyle',
              '/docs/next/api/hooks/useAnimatedStyle',
            ],
            to: '/docs/core/useAnimatedStyle',
          },
          {
            from: [
              '/docs/api/hooks/useAnimatedProps',
              '/docs/next/api/hooks/useAnimatedProps',
            ],
            to: '/docs/core/useAnimatedProps',
          },
          {
            from: [
              '/docs/api/hooks/useDerivedValue',
              '/docs/next/api/hooks/useDerivedValue',
            ],
            to: '/docs/core/useDerivedValue',
          },
          {
            from: [
              '/docs/api/hooks/useAnimatedRef',
              '/docs/next/api/hooks/useAnimatedRef',
            ],
            to: '/docs/core/useAnimatedRef',
          },
          {
            from: '/docs/api/miscellaneous/cancelAnimation',
            to: '/docs/core/cancelAnimation',
          },
          {
            from: '/docs/api/miscellaneous/createAnimatedComponent',
            to: '/docs/core/createAnimatedComponent',
          },
          {
            from: '/docs/api/hooks/useAnimatedSensor',
            to: '/docs/device/useAnimatedSensor',
          },
          {
            from: '/docs/api/hooks/useAnimatedKeyboard',
            to: '/docs/device/useAnimatedKeyboard',
          },
          {
            from: '/docs/api/hooks/useReducedMotion',
            to: '/docs/device/useReducedMotion',
          },
          {
            from: [
              '/docs/next/api/nativeMethods/scrollTo',
              '/docs/api/nativeMethods/scrollTo',
            ],
            to: '/docs/scroll/scrollTo',
          },
          {
            from: '/docs/api/hooks/useAnimatedScrollHandler',
            to: '/docs/scroll/useAnimatedScrollHandler',
          },
          {
            from: '/docs/api/hooks/useAnimatedGestureHandler',
            to: '/docs/fundamentals/handling-gestures',
          },
          {
            from: '/docs/api/nativeMethods/measure',
            to: '/docs/advanced/measure',
          },
          {
            from: '/docs/api/nativeMethods/setNativeProps',
            to: '/docs/advanced/setNativeProps',
          },
          {
            from: '/docs/api/nativeMethods/dispatchCommand',
            to: '/docs/advanced/dispatchCommand',
          },
          {
            from: '/docs/api/hooks/useAnimatedReaction',
            to: '/docs/advanced/useAnimatedReaction',
          },
          {
            from: '/docs/api/miscellaneous/makeMutable',
            to: '/docs/advanced/makeMutable',
          },
          {
            from: '/docs/api/miscellaneous/interpolate',
            to: '/docs/utilities/interpolate',
          },
          {
            from: [
              '/docs/api/miscellaneous/interpolateColor',
              '/docs/api/miscellaneous/interpolateColors',
            ],
            to: '/docs/utilities/interpolateColor',
          },
          {
            from: [
              '/docs/api/animations/withSpring',
              '/docs/api/withSpring',
              '/docs/next/api/animations/withSpring',
            ],
            to: '/docs/animations/withSpring',
          },
          {
            from: [
              '/docs/api/animations/withSequence',
              '/docs/api/withSequence',
              '/docs/next/api/animations/withSequence',
            ],
            to: '/docs/animations/withSequence',
          },
          {
            from: [
              '/docs/api/animations/withRepeat',
              '/docs/api/withRepeat',
              '/docs/next/api/animations/withRepeat',
            ],
            to: '/docs/animations/withRepeat',
          },
          {
            from: [
              '/docs/api/animations/withDelay',
              '/docs/api/withDelay',
              '/docs/next/api/animations/withDelay',
            ],
            to: '/docs/animations/withDelay',
          },
          {
            from: [
              '/docs/api/animations/withTiming',
              '/docs/api/withTiming',
              '/docs/next/api/withTiming',
              '/docs/next/api/animations/withTiming',
            ],
            to: '/docs/animations/withTiming',
          },
          {
            from: [
              '/docs/api/animations/withDecay',
              '/docs/api/withDecay',
              '/docs/next/api/animations/withDecay',
            ],
            to: '/docs/animations/withDecay',
          },
          {
            from: '/docs/fundamentals/animations',
            to: '/docs/category/animations',
          },
          {
            from: [
              '/docs/api/LayoutAnimations/layoutTransitions',
              '/docs/fundamentals/layout_animations',
            ],
            to: '/docs/layout-animations/layout-transitions',
          },
          {
            from: [
              '/docs/api/LayoutAnimations/entryAnimations',
              '/docs/api/LayoutAnimations/exitAnimations',
            ],
            to: '/docs/layout-animations/entering-exiting-animations',
          },
          {
            from: '/docs/api/LayoutAnimations/keyframeAnimations',
            to: '/docs/layout-animations/keyframe-animations',
          },
          {
            from: '/docs/api/LayoutAnimations/customAnimations',
            to: '/docs/layout-animations/custom-animations',
          },
          {
            from: ['/docs/api/layout-animations', '/docs/api/LayoutAnimations'],
            to: '/docs/category/layout-animations',
          },
          {
            from: '/docs/api/sharedElementTransitions',
            to: '/docs/shared-element-transitions/overview',
          },
          {
            from: '/docs/next/category/css-animations',
            to: '/docs/category/css-animations',
          },
        ],
      }),
    ],
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
              }),
            ],
            module: {
              rules: [
                {
                  test: /\.txt$/,
                  type: 'asset/source',
                },
                {
                  test: /\.tsx?$/,
                  use: 'babel-loader',
                },
                {
                  test: /\.js$/,
                  exclude: /\.yarn[\\/]unprocessed/,
                  use: 'babel-loader',
                },
                {
                  test: /\.m?js$/,
                  resolve: {
                    fullySpecified: false,
                  },
                },
                {
                  test: /react-native-(worklets|reanimated)[\\/]lib[\\/]module[\\/].*\.js$/,
                  type: 'javascript/auto',
                },
              ],
            },
            resolve: {
              alias: {
                'react-native$': 'react-native-web',
                typescript: path.resolve(
                  __dirname,
                  '../../.yarn/unprocessed/typescript'
                ),
              },
              extensions: ['.web.js', '...'],
              fullySpecified: false,
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
