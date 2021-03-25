export default {
  "title": "React Native Reanimated",
  "tagline": "React Native's Animated library reimplemented",
  "url": "https://docs.swmansion.com/react-native-reanimated/",
  "baseUrl": "/react-native-reanimated/",
  "favicon": "img/SWM_Fav_192x192.png",
  "organizationName": "software-mansion",
  "projectName": "react-native-reanimated",
  "onBrokenLinks": "warn",
  "customFields": {
    "shortTitle": "Reanimated"
  },
  "themeConfig": {
    "colorMode": {
      "disableSwitch": true,
      "defaultMode": "light",
      "respectPrefersColorScheme": false,
      "switchConfig": {
        "darkIcon": "🌜",
        "darkIconStyle": {},
        "lightIcon": "🌞",
        "lightIconStyle": {}
      }
    },
    "googleAnalytics": {
      "trackingID": "UA-41044622-6",
      "anonymizeIP": true
    },
    "navbar": {
      "title": "React Native Reanimated",
      "items": [
        {
          "label": "Versions",
          "to": "docs/about",
          "position": "left",
          "activeBaseRegex": "docs/(?!next)",
          "items": [
            {
              "label": "2.0.0",
              "to": "docs/",
              "activeBaseRegex": "docs/(?!2.0.0|2.0.0-rc.2|1.x.x|next)"
            },
            {
              "label": "2.0.0-rc.2",
              "to": "docs/2.0.0-rc.2/"
            },
            {
              "label": "1.x.x",
              "to": "docs/1.x.x/"
            },
            {
              "label": "Master/Unreleased",
              "to": "docs/next/",
              "activeBasePath": "docs/next"
            }
          ]
        },
        {
          "href": "https://github.com/software-mansion/react-native-reanimated",
          "label": "Repository",
          "position": "right"
        }
      ],
      "hideOnScroll": false
    },
    "prism": {
      "theme": {
        "plain": {
          "color": "#ffffff",
          "backgroundColor": "#001a72"
        },
        "styles": [
          {
            "types": [
              "comment"
            ],
            "style": {
              "color": "#aaaaaa",
              "fontStyle": "italic"
            }
          },
          {
            "types": [
              "string"
            ],
            "style": {
              "color": "#ffffff"
            }
          },
          {
            "types": [
              "punctuation"
            ],
            "style": {
              "color": "#ffee86"
            }
          },
          {
            "types": [
              "variable",
              "constant",
              "builtin",
              "attr-name"
            ],
            "style": {
              "color": "#a3b8ff"
            }
          },
          {
            "types": [
              "number",
              "operator"
            ],
            "style": {
              "color": "#ffaaa8"
            }
          },
          {
            "types": [
              "keyword"
            ],
            "style": {
              "color": "#8ed3ef"
            }
          },
          {
            "types": [
              "char"
            ],
            "style": {
              "color": "#a3b8ff"
            }
          },
          {
            "types": [
              "tag"
            ],
            "style": {
              "color": "#ffaaa8"
            }
          },
          {
            "types": [
              "function"
            ],
            "style": {
              "color": "#a3b8ff"
            }
          }
        ]
      },
      "additionalLanguages": []
    },
    "footer": {
      "style": "dark",
      "links": []
    },
    "docs": {
      "versionPersistence": "localStorage"
    },
    "metadatas": [],
    "hideableSidebar": false
  },
  "presets": [
    [
      "@docusaurus/preset-classic",
      {
        "docs": {
          "path": "docs",
          "sidebarPath": "/Users/jgonet/Projects/react-native-reanimated/docs/sidebars.js",
          "editUrl": "https://github.com/software-mansion/react-native-reanimated/tree/master/docs"
        },
        "blog": {
          "showReadingTime": true,
          "editUrl": "https://github.com/facebook/docusaurus/edit/master/website/blog/"
        },
        "theme": {
          "customCss": "/Users/jgonet/Projects/react-native-reanimated/docs/src/css/custom.css"
        }
      }
    ]
  ],
  "baseUrlIssueBanner": true,
  "i18n": {
    "defaultLocale": "en",
    "locales": [
      "en"
    ],
    "localeConfigs": {}
  },
  "onBrokenMarkdownLinks": "warn",
  "onDuplicateRoutes": "warn",
  "plugins": [],
  "themes": [],
  "titleDelimiter": "|",
  "noIndex": false
};