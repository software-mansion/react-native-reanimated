/* eslint-disable perfectionist/sort-objects */

import type { RouteNames, Routes } from '@/apps/css/navigation/types';

import routeCards from './routeCards';
import {
  AnimatedProperties,
  miscellaneous,
  realWorldExamples,
  testExamples,
  transitionSettings,
} from './screens';

const routes = {
  AnimatedProperties: {
    CardComponent: routeCards.AnimatedPropertiesCard,
    name: 'Animated Properties',
    Component: AnimatedProperties,
  },
  TransitionSettings: {
    name: 'Transition Settings',
    CardComponent: routeCards.TransitionSettingsCard,
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
      TransitionBehavior: {
        name: 'Transition Behavior',
        Component: transitionSettings.TransitionBehavior,
      },
    },
  },
  Miscellaneous: {
    name: 'Miscellaneous',
    CardComponent: routeCards.MiscellaneousCard,
    routes: {
      ChangingTransitionProperty: {
        name: 'Changing Transition Property',
        Component: miscellaneous.ChangingTransitionProperty,
      },
      UpdatingTransitionSettings: {
        name: 'Updating Transition Settings',
        Component: miscellaneous.UpdatingTransitionSettings,
      },
      MultipleTransitionSettings: {
        name: 'Multiple Transition Settings',
        Component: miscellaneous.MultipleTransitionSettings,
      },
      ReversingShortening: {
        name: 'Reversing Shortening',
        Component: miscellaneous.ReversingShortening,
      },
    },
  },
  RealWorldExamples: {
    name: 'Real World Examples',
    CardComponent: routeCards.RealWorldExamplesCard,
    routes: {
      AppSettings: {
        name: 'App Settings',
        Component: realWorldExamples.AppSettings,
      },
      FlexGallery: {
        name: 'Flex Gallery',
        Component: realWorldExamples.FlexGallery,
      },
      CircularPopupMenu: {
        name: 'Circular Popup Menu',
        Component: realWorldExamples.CircularPopupMenu,
      },
      HamburgerMenuButtons: {
        name: 'Hamburger Menu Buttons',
        Component: realWorldExamples.HamburgerMenuButtons,
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
    },
  },
} satisfies Routes;

export type TransitionsNavigationRouteName = RouteNames<
  'Transitions',
  typeof routes
>;

export default routes;
