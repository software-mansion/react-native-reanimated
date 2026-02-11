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
    Component: AnimatedProperties,
    name: 'Animated Properties',
  },
  Miscellaneous: {
    CardComponent: routeCards.MiscellaneousCard,
    name: 'Miscellaneous',
    routes: {
      ChangingTransitionProperty: {
        Component: miscellaneous.ChangingTransitionProperty,
        name: 'Changing Transition Property',
      },
      MultipleTransitionSettings: {
        Component: miscellaneous.MultipleTransitionSettings,
        name: 'Multiple Transition Settings',
      },
      ReversingShortening: {
        Component: miscellaneous.ReversingShortening,
        name: 'Reversing Shortening',
      },
      UpdatingTransitionSettings: {
        Component: miscellaneous.UpdatingTransitionSettings,
        name: 'Updating Transition Settings',
      },
    },
  },
  RealWorldExamples: {
    CardComponent: routeCards.RealWorldExamplesCard,
    name: 'Real World Examples',
    routes: {
      AppSettings: {
        Component: realWorldExamples.AppSettings,
        name: 'App Settings',
      },
      CircularPopupMenu: {
        Component: realWorldExamples.CircularPopupMenu,
        name: 'Circular Popup Menu',
      },
      FlexGallery: {
        Component: realWorldExamples.FlexGallery,
        name: 'Flex Gallery',
      },
      HamburgerMenuButtons: {
        Component: realWorldExamples.HamburgerMenuButtons,
        name: 'Hamburger Menu Buttons',
      },
    },
  },
  TestExamples: {
    CardComponent: routeCards.TestExamplesCard,
    name: 'Test Examples',
    routes: {
      Playground: {
        Component: testExamples.Playground,
        name: 'Playground',
      },
    },
  },
  TransitionSettings: {
    CardComponent: routeCards.TransitionSettingsCard,
    name: 'Transition Settings',
    routes: {
      TransitionBehavior: {
        Component: transitionSettings.TransitionBehavior,
        name: 'Transition Behavior',
      },
      TransitionDelay: {
        Component: transitionSettings.TransitionDelay,
        name: 'Transition Delay',
      },
      TransitionDuration: {
        Component: transitionSettings.TransitionDuration,
        name: 'Transition Duration',
      },
      TransitionProperty: {
        Component: transitionSettings.TransitionProperty,
        name: 'Transition Property',
      },
      TransitionTimingFunction: {
        Component: transitionSettings.TransitionTimingFunction,
        name: 'Transition Timing Function',
      },
    },
  },
} satisfies Routes;

export type TransitionsNavigationRouteName = RouteNames<
  'Transitions',
  typeof routes
>;

export default routes;
