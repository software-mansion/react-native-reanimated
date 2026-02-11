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
    },
  },
  TestExamples: {
    CardComponent: routeCards.TestExamplesCard,
    name: 'Test Examples',
    routes: {
      IterationCountAndFillMode: {
        Component: testExamples.IterationCountAndFillMode,
        displayed: !IS_WEB,
        labelTypes: ['needsFix'],
        name: 'Iteration Count and Fill Mode',
      },
      Playground: {
        Component: testExamples.Playground,
        name: 'Playground',
      },
      RelativeMargins: {
        Component: testExamples.RelativeMargins,
        displayed: !IS_WEB,
        labelTypes: ['needsFix'],
        name: 'Relative Margins',
      },
    },
  },
} satisfies Routes;

export type AnimationsNavigationRouteName = RouteNames<
  'Animations',
  typeof routes
>;

export default routes;
