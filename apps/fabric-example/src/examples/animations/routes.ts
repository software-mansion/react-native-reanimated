/* eslint-disable perfectionist/sort-objects */
import type { RouteNames, Routes } from '@/navigation/types';

import routeCards from './routeCards';
import {
  animatedProperties,
  animationSettings,
  miscellaneous,
  realWorldExamples,
  testExamples,
} from './screens';

const routes = {
  AnimatedProperties: {
    name: 'Animated Properties',
    CardComponent: routeCards.AnimatedPropertiesCard,
    flatten: true,
    routes: {
      LayoutAndPositioning: {
        name: 'Layout and Positioning',
        routes: {
          FlexBox: {
            name: 'FlexBox',
            routes: {
              FlexDirection: {
                name: 'Flex Direction',
                Component: animatedProperties.flexBox.FlexDirection,
              },
            },
          },
          Dimensions: {
            name: 'Dimensions',
            Component: animatedProperties.Dimensions,
          },
          Margins: {
            name: 'Margins',
            Component: animatedProperties.Margins,
          },
          Paddings: {
            name: 'Paddings',
            Component: animatedProperties.Paddings,
          },
          Insets: {
            name: 'Insets',
            Component: animatedProperties.Insets,
          },
          Others: {
            name: 'Others',
            routes: {},
          },
        },
      },
      Appearance: {
        name: 'Appearance',
        routes: {
          Colors: {
            name: 'Colors',
            routes: {
              ColorFormats: {
                name: 'Color Formats',
                Component: animatedProperties.colors.ColorFormats,
              },
              ColorFunctions: {
                name: 'Color Properties',
                Component: animatedProperties.colors.ColorProperties,
              },
            },
          },
          Shadows: {
            name: 'Shadows',
            routes: {},
          },
          Borders: {
            name: 'Borders',
            Component: animatedProperties.Borders,
          },
          Transforms: {
            name: 'Transforms',
            flatten: true,
            routes: {
              TransformProperties: {
                name: 'Transform Properties',
                routes: {
                  Perspective: {
                    name: 'Perspective',
                    Component:
                      animatedProperties.transforms.transformProperties
                        .Perspective,
                  },
                  Rotate: {
                    name: 'Rotate',
                    Component:
                      animatedProperties.transforms.transformProperties.Rotate,
                  },
                  Scale: {
                    name: 'Scale',
                    Component:
                      animatedProperties.transforms.transformProperties.Scale,
                  },
                  Translate: {
                    name: 'Translate',
                    Component:
                      animatedProperties.transforms.transformProperties
                        .Translate,
                  },
                  Skew: {
                    name: 'Skew',
                    Component:
                      animatedProperties.transforms.transformProperties.Skew,
                  },
                  Matrix: {
                    name: 'Matrix',
                    Component:
                      animatedProperties.transforms.transformProperties.Matrix,
                  },
                },
              },
              RelatedProperties: {
                name: 'Related Properties',
                routes: {
                  TransformOrigin: {
                    name: 'Transform Origin',
                    Component:
                      animatedProperties.transforms.relatedProperties
                        .TransformOrigin,
                  },
                },
              },
            },
          },
          Others: {
            name: 'Others',
            routes: {},
          },
        },
      },
      Typography: {
        name: 'Typography',
        routes: {
          Font: {
            name: 'Font',
            routes: {},
          },
        },
      },
      Others: {
        name: 'Others',
        routes: {
          Image: {
            name: 'Image',
            routes: {},
          },
          Cursor: {
            name: 'Cursor',
            routes: {},
          },
        },
      },
    },
  },
  AnimationSettings: {
    name: 'Animation Settings',
    CardComponent: routeCards.AnimationSettingsCard,
    routes: {
      Duration: {
        name: 'Duration',
        Component: animationSettings.AnimationDuration,
      },
      TimingFunction: {
        name: 'Timing Function',
        Component: animationSettings.AnimationTimingFunction,
      },
      Delay: {
        name: 'Delay',
        Component: animationSettings.AnimationDelay,
      },
      IterationCount: {
        name: 'Iteration Count',
        Component: animationSettings.AnimationIterationCount,
      },
      Direction: {
        name: 'Direction',
        Component: animationSettings.AnimationDirection,
      },
      FillMode: {
        name: 'Fill Mode',
        Component: animationSettings.AnimationFillMode,
      },
      PlayState: {
        name: 'Play State',
        Component: animationSettings.AnimationPlayState,
      },
    },
  },
  Miscellaneous: {
    name: 'Miscellaneous',
    CardComponent: routeCards.MiscellaneousCard,
    routes: {
      ChangingAnimation: {
        name: 'Changing Animation',
        Component: miscellaneous.ChangingAnimation,
      },
      UpdatingAnimationSettings: {
        name: 'Updating Animation Settings',
        Component: miscellaneous.UpdatingAnimationSettings,
      },
    },
  },
  RealWorldExamples: {
    name: 'Real World Examples',
    CardComponent: routeCards.RealWorldExamplesCard,
    routes: {
      SpinnersAndLoaders: {
        name: 'Spinners and Loaders',
        Component: realWorldExamples.SpinnersAndLoaders,
      },
      Emojis: {
        name: 'Emojis',
        Component: realWorldExamples.Emojis,
      },
      Campfire: {
        name: 'Campfire',
        Component: realWorldExamples.Campfire,
      },
      RocketInSpace: {
        name: 'Rocket In Space',
        Component: realWorldExamples.RocketInSpace,
      },
      SquishySquashy: {
        name: 'Squishy Squashy',
        Component: realWorldExamples.SquishySquashy,
      },
    },
  },
  TestExamples: {
    name: 'Test Examples',
    CardComponent: routeCards.TestExamplesCard,
    routes: {
      Playground: {
        name: 'Playground',
        Component: testExamples.Playground,
      },
      IterationCountAndFillMode: {
        name: 'Iteration Count and Fill Mode',
        Component: testExamples.IterationCountAndFillMode,
      },
    },
  },
} satisfies Routes;

export type AnimationsNavigationRouteName = RouteNames<
  'Animations',
  typeof routes
>;

export default routes;
