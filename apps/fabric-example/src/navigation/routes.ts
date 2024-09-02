import { AnimatedProperties, Playground } from '../examples';
import type { Routes } from './types';

// TODO: Add more routes after implementing examples
const routes: Routes = {
  Playground: {
    name: 'Playground',
    Component: Playground,
  },
  AnimatedProperties: {
    name: 'Animated Properties',
    routes: {
      Dimensions: {
        name: 'Dimensions',
        Component: AnimatedProperties.DimensionsExample,
      },
      FlexStyles: {
        name: 'Flex Styles',
        Component: AnimatedProperties.FlexStylesExample,
      },
      Insets: {
        name: 'Insets',
        Component: AnimatedProperties.InsetsExample,
      },
      Transforms: {
        name: 'Transforms',
        Component: AnimatedProperties.TransformsExample,
      },
      Colors: {
        name: 'Colors',
        Component: AnimatedProperties.ColorsExample,
      },
      Borders: {
        name: 'Borders',
        Component: AnimatedProperties.BordersExample,
      },
      Margins: {
        name: 'Margins',
        Component: AnimatedProperties.MarginsExample,
      },
      Paddings: {
        name: 'Paddings',
        Component: AnimatedProperties.PaddingsExample,
      },
    },
  },
  Easings: {
    name: 'Easings',
    routes: {},
  },
  AnimationSettings: {
    name: 'Animation Settings',
    routes: {},
  },
  RealWorldExamples: {
    name: 'Real World Examples',
    routes: {},
  },
};

export default routes;
