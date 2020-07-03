const versions = require('./versions.json');

module.exports = {
  title: 'React Native Reanimated',
  tagline: "React Native's Animated library reimplemented",
  url: 'https://docs.swmansion.com/react-native-reanimated/',
  baseUrl: '/react-native-reanimated/',
  favicon: 'img/SWM_Fav_192x192.png',
  organizationName: 'software-mansion', // Usually your GitHub org/user name.
  projectName: 'react-native-reanimated', // Usually your repo name.
  customFields: {
    shortTitle: 'Reanimated',
  },
  themeConfig: {
    disableDarkMode: true,
    announcementBar: {
      id: 'old_version', // Any value that will identify this message.
      content:
        'This is a documentation website for Reanimated 2.0 alpha release. If you are looking for Reanimated 1 docs <a target="_blank" rel="noopener noreferrer" href="https://docs.swmansion.com/react-native-reanimated/docs/1.x.x/">here is a link</a>',
      backgroundColor: '#ffaaa8', // Defaults to `#fff`.
      textColor: '#001a72', // Defaults to `#000`.
    },
    googleAnalytics: {
      trackingID: 'UA-41044622-6',
      anonymizeIP: true, // Should IPs be anonymized?
    },

    navbar: {
      title: 'React Native Reanimated',
      links: [
        {
          label: 'Docs',
          to: 'docs/about',
          position: 'left',
          activeBaseRegex: `docs/(?!next)`,
          items: [
            {
              label: 'Master',
              to: 'docs/next/',
              activeBasePath: 'docs/next',
            },
            {
              label: versions[0],
              to: 'docs/',
              activeBaseRegex: `docs/(?!${versions.join('|')}|next)`,
            },
            ...versions.slice(1).map(version => ({
              label: version,
              to: `docs/${version}/`,
            })),
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
      links: [
        // {
        //   title: 'Docs',
        //   items: [
        //     {
        //       label: 'Style Guide',
        //       to: 'docs/',
        //     },
        //     {
        //       label: 'Second Doc',
        //       to: 'docs/doc2/',
        //     },
        //   ],
        // },
        // {
        //   title: 'Community',
        //   items: [
        //     {
        //       label: 'Stack Overflow',
        //       href: 'https://stackoverflow.com/questions/tagged/docusaurus',
        //     },
        //     {
        //       label: 'Discord',
        //       href: 'https://discordapp.com/invite/docusaurus',
        //     },
        //     {
        //       label: 'Twitter',
        //       href: 'https://twitter.com/docusaurus',
        //     },
        //   ],
        // },
        // {
        //   title: 'More',
        //   items: [
        //     {
        //       label: 'Blog',
        //       to: 'blog',
        //     },
        //     {
        //       label: 'GitHub',
        //       href: 'https://github.com/facebook/docusaurus',
        //     },
        //   ],
        // },
      ],
      // copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
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
