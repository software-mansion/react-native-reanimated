import type { RouteNames, Routes } from '../../navigation/types';
import { AnimatedProperties, TestExamples, RealWorldExamples } from './screens';

const routes = {
  AnimatedProperties: {
    name: 'Animated Properties',
    Component: AnimatedProperties,
  },
  RealWorldExamples: {
    name: 'Real World Examples',
    routes: {
      AppSettings: {
        name: 'App Settings',
        Component: RealWorldExamples.AppSettings,
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
