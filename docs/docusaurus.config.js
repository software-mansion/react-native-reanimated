const versions = require('./versions.json');

module.exports = {
  title: 'React Native Reanimated',
  tagline: "React Native's Animated library reimplemented",
  url: 'https://docs.swmansion.com/react-native-reanimated/',
  baseUrl: '/react-native-reanimated/',
  favicon: 'img/SWM_Fav_192x192.png',
  organizationName: 'software-mansion', // Usually your GitHub org/user name.
  projectName: 'react-native-reanimated', // Usually your repo name.
  onBrokenLinks: 'warn',
  customFields: {
    shortTitle: 'Reanimated',
  },
  themeConfig: {
    disableDarkMode: true,
    googleAnalytics: {
      trackingID: 'UA-41044622-6',
      anonymizeIP: true, // Should IPs be anonymized?
    },

    navbar: {
      title: 'React Native Reanimated',
      links: [
        {
          label: 'Versions',
          to: 'docs/about',
          position: 'left',
          activeBaseRegex: `docs/(?!next)`,
          items: [
            {
              label: versions[0],
              to: 'docs/',
              activeBaseRegex: `docs/(?!${versions.join('|')}|next)`,
            },
            ...versions.slice(1).map((version) => ({
              label: version,
              to: `docs/${version}/`,
            })),
            {
              label: 'Master/Unreleased',
              to: 'docs/next/',
              activeBasePath: 'docs/next',
            },
          ],
        },
        // {to: 'blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/software-mansion/react-native-reanimated',
          label: '',
          position: 'right',
        },
      ],
    },
    prism: {
      theme: {
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
      },
      // darkTheme: require('prism-react-renderer/themes/dracula'),
    },
    footer: {
      style: 'dark',
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          homePageId: 'about',
          path: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl:
            'https://github.com/software-mansion/react-native-reanimated/tree/master/docs',
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          editUrl:
            'https://github.com/facebook/docusaurus/edit/master/website/blog/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
