import type { RouteNames, Routes } from '../../navigation/types';
import {
  TransitionedProperties,
  testExamples,
  realWorldExamples,
  transitionSettings,
  miscellaneous,
} from './screens';

const routes = {
  AnimatedProperties: {
    name: 'Transitioned Properties',
    Component: TransitionedProperties,
  },
  TransitionSettings: {
    name: 'Transition Settings',
    routes: {
      TransitionProperty: {
        name: 'Transition Property',
        Component: transitionSettings.TransitionProperty,
      },
      TransitionDuration: {
        name: 'Transition Duration',
        Component: transitionSettings.TransitionDuration,
      },
      TransitionDelay: {
        name: 'Transition Delay',
        Component: transitionSettings.TransitionDelay,
      },
      TransitionTimingFunction: {
        name: 'Transition Timing Function',
        Component: transitionSettings.TransitionTimingFunction,
      },
    },
  },
  Miscellaneous: {
    name: 'Miscellaneous',
    routes: {
      ChangingTransitionProperty: {
        name: 'Changing Transition Property',
        Component: miscellaneous.ChangingTransitionProperty,
      },
      UpdatingTransitionSettings: {
        name: 'Updating Transition Settings',
        Component: miscellaneous.UpdatingTransitionSettings,
      },
    },
  },
  RealWorldExamples: {
    name: 'Real World Examples',
    routes: {
      AppSettings: {
        name: 'App Settings',
        Component: realWorldExamples.AppSettings,
      },
      FlexGallery: {
        name: 'Flex Gallery',
        Component: realWorldExamples.FlexGallery,
      },
    },
  },
  TestExamples: {
    name: 'Test Examples',
    routes: {
      Playground: {
        name: 'Playground',
        Component: testExamples.Playground,
      },
    },
  },
} satisfies Routes;

export type TransitionsNavigationRouteName = RouteNames<
  'Transitions',
  typeof routes
>;

export default routes;
