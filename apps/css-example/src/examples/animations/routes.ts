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

/** Animated Properties routes */

const layoutAndPositioningRoutes = {
  FlexBox: {
    name: 'FlexBox',
    flatten: true,
    routes: {
      DiscreteProperties: {
        name: 'Discrete Properties',
        routes: {
          FlexDirection: {
            name: 'Flex Direction',
            Component:
              animatedProperties.layoutAndPositioning.flexBox.FlexDirection,
          },
          LayoutDirection: {
            name: 'Layout Direction',
            Component:
              animatedProperties.layoutAndPositioning.flexBox.LayoutDirection,
          },
          JustifyContent: {
            name: 'Justify Content',
            Component:
              animatedProperties.layoutAndPositioning.flexBox.JustifyContent,
          },
          AlignItems: {
            name: 'Align Items',
            Component:
              animatedProperties.layoutAndPositioning.flexBox.AlignItems,
          },
          AlignSelf: {
            name: 'Align Self',
            Component:
              animatedProperties.layoutAndPositioning.flexBox.AlignSelf,
          },
          AlignContent: {
            name: 'Align Content',
            Component:
              animatedProperties.layoutAndPositioning.flexBox.AlignContent,
          },
          FlexWrap: {
            name: 'Flex Wrap',
            Component: animatedProperties.layoutAndPositioning.flexBox.FlexWrap,
          },
        },
      },
      NumericProperties: {
        name: 'Numeric Properties',
        routes: {},
      },
    },
  },
  Dimensions: {
    name: 'Dimensions',
    Component: animatedProperties.layoutAndPositioning.Dimensions,
  },
  Margins: {
    name: 'Margins',
    Component: animatedProperties.layoutAndPositioning.Margins,
  },
  Paddings: {
    name: 'Paddings',
    Component: animatedProperties.layoutAndPositioning.Paddings,
  },
  Insets: {
    name: 'Insets',
    Component: animatedProperties.layoutAndPositioning.Insets,
  },
  Others: {
    name: 'Others',
    routes: {
      AspectRatio: {
        name: 'Aspect Ratio',
        Component: animatedProperties.layoutAndPositioning.others.AspectRatio,
      },
    },
  },
} satisfies Routes;

const appearanceRoutes = {
  Colors: {
    name: 'Colors',
    routes: {
      ColorFormats: {
        name: 'Color Formats',
        Component: animatedProperties.appearance.colors.ColorFormats,
      },
      ColorFunctions: {
        name: 'Color Properties',
        Component: animatedProperties.appearance.colors.ColorProperties,
      },
    },
  },
  Shadows: {
    name: 'Shadows',
    routes: {},
  },
  Borders: {
    name: 'Borders',
    Component: animatedProperties.appearance.Borders,
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
              animatedProperties.appearance.transforms.transformProperties
                .Perspective,
          },
          Rotate: {
            name: 'Rotate',
            Component:
              animatedProperties.appearance.transforms.transformProperties
                .Rotate,
          },
          Scale: {
            name: 'Scale',
            Component:
              animatedProperties.appearance.transforms.transformProperties
                .Scale,
          },
          Translate: {
            name: 'Translate',
            Component:
              animatedProperties.appearance.transforms.transformProperties
                .Translate,
          },
          Skew: {
            name: 'Skew',
            Component:
              animatedProperties.appearance.transforms.transformProperties.Skew,
          },
          Matrix: {
            name: 'Matrix',
            Component:
              animatedProperties.appearance.transforms.transformProperties
                .Matrix,
          },
        },
      },
      RelatedProperties: {
        name: 'Related Properties',
        routes: {
          TransformOrigin: {
            name: 'Transform Origin',
            Component:
              animatedProperties.appearance.transforms.relatedProperties
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
} satisfies Routes;

const othersRoutes = {
  Image: {
    name: 'Image',
    routes: {
      ResizeMode: {
        name: 'Resize Mode',
        Component: animatedProperties.others.image.ResizeMode,
      },
      ObjectFit: {
        name: 'Object Fit',
        Component: animatedProperties.others.image.ObjectFit,
      },
    },
  },
  Cursor: {
    name: 'Cursor',
    routes: {},
  },
} satisfies Routes;

/** Animations routes */

const routes = {
  AnimatedProperties: {
    name: 'Animated Properties',
    CardComponent: routeCards.AnimatedPropertiesCard,
    flatten: true,
    routes: {
      LayoutAndPositioning: {
        name: 'Layout and Positioning',
        routes: layoutAndPositioningRoutes,
      },
      Appearance: {
        name: 'Appearance',
        routes: appearanceRoutes,
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
        routes: othersRoutes,
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
