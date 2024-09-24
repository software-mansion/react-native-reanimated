import {
  AnimatedProperties,
  Playground,
  AnimationSettings,
  RealWorldExamples,
  Miscellaneous,
} from '../examples';
import RouteCards from './cards';
import type { RouteNames, Routes } from './types';

const routes = {
  Playground: {
    name: 'Playground',
    Component: Playground,
  },
  AnimatedProperties: {
    name: 'Animated Properties',
    CardComponent: RouteCards.AnimatedPropertiesCard,
    routes: {
      Dimensions: {
        name: 'Dimensions',
        Component: AnimatedProperties.Dimensions,
      },
      FlexStyles: {
        name: 'Flex Styles',
        Component: AnimatedProperties.FlexStyles,
      },
      Insets: {
        name: 'Insets',
        Component: AnimatedProperties.Insets,
      },
      Transforms: {
        name: 'Transforms',
        Component: AnimatedProperties.Transforms,
      },
      Colors: {
        name: 'Colors',
        Component: AnimatedProperties.Colors,
      },
      Borders: {
        name: 'Borders',
        Component: AnimatedProperties.Borders,
      },
      Margins: {
        name: 'Margins',
        Component: AnimatedProperties.Margins,
      },
      Paddings: {
        name: 'Paddings',
        Component: AnimatedProperties.Paddings,
      },
    },
  },
  AnimationSettings: {
    name: 'Animation Settings',
    CardComponent: RouteCards.AnimationSettingsCard,
    routes: {
      Duration: {
        name: 'Duration',
        Component: AnimationSettings.AnimationDuration,
      },
      TimingFunction: {
        name: 'Timing Function',
        Component: AnimationSettings.AnimationTimingFunction,
      },
      Delay: {
        name: 'Delay',
        Component: AnimationSettings.AnimationDelay,
      },
      IterationCount: {
        name: 'Iteration Count',
        Component: AnimationSettings.AnimationIterationCount,
      },
      Direction: {
        name: 'Direction',
        Component: AnimationSettings.AnimationDirection,
      },
      FillMode: {
        name: 'Fill Mode',
        Component: AnimationSettings.AnimationFillMode,
      },
      PlayState: {
        name: 'Play State',
        Component: AnimationSettings.AnimationPlayState,
      },
    },
  },
  RealWorldExamples: {
    name: 'Real World Examples',
    CardComponent: RouteCards.RealWorldExamplesCard,
    routes: {
      SpinnersAndLoaders: {
        name: 'Spinners and Loaders',
        Component: RealWorldExamples.SpinnersAndLoaders,
      },
      Emojis: {
        name: 'Emojis',
        Component: RealWorldExamples.Emojis,
      },
      Campfire: {
        name: 'Campfire',
        Component: RealWorldExamples.Campfire,
      },
      RocketInSpace: {
        name: 'Rocket In Space',
        Component: RealWorldExamples.RocketInSpace,
      },
      SquishySquashy: {
        name: 'Squishy Squashy',
        Component: RealWorldExamples.SquishySquashy,
      },
    },
  },
  Miscellaneous: {
    name: 'Miscellaneous',
    routes: {
      ChangingAnimation: {
        name: 'Changing Animation',
        Component: Miscellaneous.ChangingAnimation,
      },
    },
  },
} satisfies Routes;

export type NavigationRouteName = RouteNames<'Examples', typeof routes>;

export default routes;
