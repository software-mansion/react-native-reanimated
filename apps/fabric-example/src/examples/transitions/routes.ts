import type { RouteNames, Routes } from '../../navigation/types';
import {
  TransitionedProperties,
  TestExamples,
  RealWorldExamples,
  TransitionSettings,
  Miscellaneous,
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
        Component: TransitionSettings.TransitionProperty,
      },
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
  Miscellaneous: {
    name: 'Miscellaneous',
    routes: {
      ChangingTransitionProperty: {
        name: 'Changing Transition Property',
        Component: Miscellaneous.ChangingTransitionProperty,
      },
      UpdatingTransitionSettings: {
        name: 'Updating Transition Settings',
        Component: Miscellaneous.UpdatingTransitionSettings,
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
