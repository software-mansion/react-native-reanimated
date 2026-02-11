import { svgAnimatedProperties } from '@/apps/css/examples/animations/screens';
import type { Routes } from '@/apps/css/navigation/types';

export const svgPropertiesRoutes = {
  Circle: {
    Component: svgAnimatedProperties.Circle,
    name: 'Circle',
  },
  Common: {
    name: 'Common',
    routes: {
      FillAndColor: {
        Component: svgAnimatedProperties.common.FillAndColor,
        name: 'Fill and Color',
      },
      Stroke: {
        Component: svgAnimatedProperties.common.Stroke,
        name: 'Stroke',
      },
    },
  },
  Ellipse: {
    Component: svgAnimatedProperties.Ellipse,
    name: 'Ellipse',
  },
  Image: {
    Component: svgAnimatedProperties.Image,
    name: 'Image',
  },
  Line: {
    Component: svgAnimatedProperties.Line,
    name: 'Line',
  },
  Path: {
    Component: svgAnimatedProperties.Path,
    name: 'Path',
  },
  Rect: {
    Component: svgAnimatedProperties.Rect,
    name: 'Rect',
  },
} satisfies Routes;
