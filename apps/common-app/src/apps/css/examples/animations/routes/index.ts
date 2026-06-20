import type { RouteNames, Routes } from '@/apps/css/navigation/types';
import { IS_WEB } from '@/utils';

import routeCards from '../routeCards';
import {
  animationSettings,
  miscellaneous,
  realWorldExamples,
  testExamples,
} from '../screens';
import { animatedPropertiesRoutes } from './properties';

const routes = {
  AnimatedProperties: {
    CardComponent: routeCards.AnimatedPropertiesCard,
    name: 'Animated Properties',
    routes: animatedPropertiesRoutes,
  },
  AnimationSettings: {
    CardComponent: routeCards.AnimationSettingsCard,
    name: 'Animation Settings',
    routes: {
      Delay: {
        Component: animationSettings.AnimationDelay,
        name: 'Delay',
      },
      Direction: {
        Component: animationSettings.AnimationDirection,
        name: 'Direction',
      },
      Duration: {
        Component: animationSettings.AnimationDuration,
        name: 'Duration',
      },
      FillMode: {
        Component: animationSettings.AnimationFillMode,
        name: 'Fill Mode',
      },
      IterationCount: {
        Component: animationSettings.AnimationIterationCount,
        name: 'Iteration Count',
      },
      PlayState: {
        Component: animationSettings.AnimationPlayState,
        name: 'Play State',
      },
      TimingFunction: {
        Component: animationSettings.AnimationTimingFunction,
        name: 'Timing Function',
      },
    },
  },
  Miscellaneous: {
    CardComponent: routeCards.MiscellaneousCard,
    name: 'Miscellaneous',
    routes: {
      ChangingAnimation: {
        Component: miscellaneous.ChangingAnimation,
        name: 'Changing Animation',
      },
      KeyframeTimingFunctions: {
        Component: miscellaneous.KeyframeTimingFunctions,
        name: 'Keyframe Timing Functions',
      },
      MultipleAnimations: {
        Component: miscellaneous.MultipleAnimations,
        name: 'Multiple Animations',
      },
      UpdatingAnimationSettings: {
        Component: miscellaneous.UpdatingAnimationSettings,
        name: 'Updating Animation Settings',
      },
    },
  },
  RealWorldExamples: {
    CardComponent: routeCards.RealWorldExamplesCard,
    name: 'Real World Examples',
    routes: {
      Campfire: {
        Component: realWorldExamples.Campfire,
        name: 'Campfire',
      },
      Emojis: {
        Component: realWorldExamples.Emojis,
        name: 'Emojis',
      },
      RocketInSpace: {
        Component: realWorldExamples.RocketInSpace,
        name: 'Rocket In Space',
      },
      SpinnersAndLoaders: {
        Component: realWorldExamples.SpinnersAndLoaders,
        name: 'Spinners and Loaders',
      },
      SquishySquashy: {
        Component: realWorldExamples.SquishySquashy,
        name: 'Squishy Squashy',
      },
      SVGReleaseExample: {
        Component: realWorldExamples.SVGReleaseExample,
        name: 'SVG Release (4.3.0)',
      },
    },
  },
  TestExamples: {
    CardComponent: routeCards.TestExamplesCard,
    name: 'Test Examples',
    /* eslint-disable perfectionist/sort-objects -- Keep the Playground first for quick access */
    routes: {
      Playground: {
        Component: testExamples.Playground,
        name: 'Playground',
      },
      IterationCountAndFillMode: {
        Component: testExamples.IterationCountAndFillMode,
        displayed: !IS_WEB,
        labelTypes: ['needsFix'],
        name: 'Iteration Count and Fill Mode',
      },
      RelativeMargins: {
        Component: testExamples.RelativeMargins,
        displayed: !IS_WEB,
        labelTypes: ['needsFix'],
        name: 'Relative Margins',
      },
    },
    /* eslint-enable perfectionist/sort-objects */
  },
} satisfies Routes;

export type AnimationsNavigationRouteName = RouteNames<
  'Animations',
  typeof routes
>;

export default routes;
