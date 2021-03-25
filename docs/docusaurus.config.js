/* eslint-disable @typescript-eslint/indent */
/** @type {import('@docusaurus/types').DocusaurusConfig} */

module.exports = {
  title: 'React Native Reanimated',
  tagline: "React Native's Animated library reimplemented",
  url: 'https://docs.swmansion.com/react-native-reanimated/',
  baseUrl: '/react-native-reanimated/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/SWM_Fav_192x192.png',
  organizationName: 'software-mansion',
  customFields: {
    shortTitle: 'Reanimated',
  },
  projectName: 'react-native-reanimated',
  themeConfig: {
    googleAnalytics: {
      trackingID: 'UA-41044622-6',
      anonymizeIP: true,
    },
    colorMode: {
      disableSwitch: true,
    },
    navbar: {
      title: 'React Native Reanimated',
      logo: {
        alt: 'My Site Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: 'docs/',
          activeBasePath: 'docs',
          label: 'Docs',
          position: 'left',
        },
        {
          href: 'https://github.com/facebook/docusaurus',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
    },
    prism: {
      theme: prismConfig,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          path: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/software-mansion/react-native-reanimated/tree/master/docs',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};

const prismConfig = {
  plain: {
    color: '#ffffff',
    backgroundColor: '#001a72',
  },
  styles: [
    {
      types: ['comment'],
      style: {
        color: '#aaaaaa',
        fontStyle: 'italic',
      },
    },
    {
      types: ['string'],
      style: {
        color: '#ffffff',
      },
    },
    {
      types: ['punctuation'],
      style: {
        color: '#ffee86',
      },
    },
    {
      types: ['variable', 'constant', 'builtin', 'attr-name'],
      style: {
        color: '#a3b8ff',
      },
    },
    {
      types: ['number', 'operator'],
      style: {
        color: '#ffaaa8',
      },
    },
    {
      types: ['keyword'],
      style: {
        color: '#8ed3ef',
      },
    },
    {
      types: ['char'],
      style: {
        color: '#a3b8ff',
      },
    },
    {
      types: ['tag'],
      style: {
        color: '#ffaaa8',
      },
    },
    {
      types: ['function'],
      style: {
        color: '#a3b8ff',
      },
    },
  ],
};
