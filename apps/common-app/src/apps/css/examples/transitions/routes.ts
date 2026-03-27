/* eslint-disable perfectionist/sort-objects */

import type { RouteNames, Routes } from '@/apps/css/navigation/types';

import routeCards from './routeCards';
import {
  Active as PseudoActive,
  ActiveDeepest as PseudoActiveDeepest,
  AnimatedProperties,
  Focus as PseudoFocus,
  FocusWithin as PseudoFocusWithin,
  Hover as PseudoHover,
  HoverWithLoop as PseudoHoverWithLoop,
  miscellaneous,
  PerStateTransitionConfig as PseudoPerStateTransitionConfig,
  realWorldExamples,
  Showcase as PseudoShowcase,
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
  PseudoSelectors: {
    name: 'Pseudo Selectors',
    CardComponent: routeCards.PseudoSelectorsCard,
    routes: {
      PseudoHover: {
        name: ':hover',
        Component: PseudoHover,
      },
      PseudoActive: {
        name: ':active',
        Component: PseudoActive,
      },
      PseudoActiveDeepest: {
        name: ':active-deepest',
        Component: PseudoActiveDeepest,
      },
      PseudoFocus: {
        name: ':focus',
        Component: PseudoFocus,
      },
      PseudoFocusWithin: {
        name: ':focus-within',
        Component: PseudoFocusWithin,
      },
      PseudoHoverWithLoop: {
        name: 'Looping transition + :hover',
        Component: PseudoHoverWithLoop,
      },
      PseudoPerStateTransitionConfig: {
        name: 'Per-state transition configs',
        Component: PseudoPerStateTransitionConfig,
      },
      PseudoShowcase: {
        name: 'Showcase',
        Component: PseudoShowcase,
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
