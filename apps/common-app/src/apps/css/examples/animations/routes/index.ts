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
    name: 'Animated Properties',
    CardComponent: routeCards.AnimatedPropertiesCard,
    routes: animatedPropertiesRoutes,
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
      KeyframeTimingFunctions: {
        name: 'Keyframe Timing Functions',
        Component: miscellaneous.KeyframeTimingFunctions,
      },
      MultipleAnimations: {
        name: 'Multiple Animations',
        Component: miscellaneous.MultipleAnimations,
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
        displayed: !IS_WEB,
        labelTypes: ['needsFix'],
        Component: testExamples.IterationCountAndFillMode,
      },
      RelativeMargins: {
        name: 'Relative Margins',
        displayed: !IS_WEB,
        labelTypes: ['needsFix'],
        Component: testExamples.RelativeMargins,
      },
    },
  },
} satisfies Routes;

export type AnimationsNavigationRouteName = RouteNames<
  'Animations',
  typeof routes
>;

export default routes;
