import type { RouteNames, Routes } from '../../navigation/types';
import {
  AnimatedProperties,
  TestExamples,
  RealWorldExamples,
  TransitionSettings,
} from './screens';

const routes = {
  AnimatedProperties: {
    name: 'Animated Properties',
    Component: AnimatedProperties,
  },
  TransitionSettings: {
    name: 'Transition Settings',
    routes: {
      TransitionDuration: {
        name: 'Transition Duration',
        Component: TransitionSettings.TransitionDuration,
      },
      TransitionDelay: {
        name: 'Transition Delay',
        Component: TransitionSettings.TransitionDelay,
      },
      TransitionTimingFunction: {
        name: 'Transition Timing Function',
        Component: TransitionSettings.TransitionTimingFunction,
      },
    },
  },
  RealWorldExamples: {
    name: 'Real World Examples',
    routes: {
      AppSettings: {
        name: 'App Settings',
        Component: RealWorldExamples.AppSettings,
      },
      FlexGallery: {
        name: 'Flex Gallery',
        Component: RealWorldExamples.FlexGallery,
      },
    },
  },
  TestExamples: {
    name: 'Test Examples',
    routes: {
      Playground: {
        name: 'Playground',
        Component: TestExamples.Playground,
      },
    },
  },
} satisfies Routes;

export type TransitionsNavigationRouteName = RouteNames<
  'Transitions',
  typeof routes
>;

export default routes;
