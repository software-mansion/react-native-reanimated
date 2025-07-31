import { svgAnimatedProperties } from '@/apps/css/examples/animations/screens';
import type { Routes } from '@/apps/css/navigation/types';

export const svgPropertiesRoutes = {
  Common: {
    name: 'Common',
    routes: {
      FillAndColor: {
        name: 'Fill and Color',
        Component: svgAnimatedProperties.common.FillAndColor,
      },
      Stroke: {
        name: 'Stroke',
        Component: svgAnimatedProperties.common.Stroke,
      },
      Transform: {
        name: 'Transform',
        Component: svgAnimatedProperties.common.Transform,
      },
    },
  },
  Components: {
    name: 'Components',
    routes: {
      Circle: {
        name: 'Circle',
        Component: svgAnimatedProperties.Circle,
      },
    },
  },
} satisfies Routes;
