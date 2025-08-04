import { svgAnimatedProperties } from '@/apps/css/examples/animations/screens';
import type { Routes } from '@/apps/css/navigation/types';

export const svgPropertiesRoutes = {
  Circle: {
    name: 'Circle',
    Component: svgAnimatedProperties.Circle,
  },
  Rect: {
    name: 'Rect',
    Component: svgAnimatedProperties.Rect,
  },
  Ellipse: {
    name: 'Ellipse',
    Component: svgAnimatedProperties.Ellipse,
  },
  Line: {
    name: 'Line',
    Component: svgAnimatedProperties.Line,
  },
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
    },
  },
} satisfies Routes;
