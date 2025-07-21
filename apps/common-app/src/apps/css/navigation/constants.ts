import { faExchange, faFire } from '@fortawesome/free-solid-svg-icons';

import { animationRoutes, transitionRoutes } from '../examples';
import type { TabRoute } from './types';

export const BOTTOM_BAR_HEIGHT = 60;

// We use stack navigator to mimic the tab navigator, thus top-level routes will be
// displayed as tabs in the bottom tab bar
export const TAB_ROUTES = {
  Animations: {
    icon: faFire,
    name: 'Animations',
    routes: animationRoutes,
  },
  Transitions: {
    icon: faExchange,
    name: 'Transitions',
    routes: transitionRoutes,
  },
} satisfies Record<string, TabRoute>;

export const INITIAL_ROUTE_NAME = Object.values(TAB_ROUTES)[0]?.name;
