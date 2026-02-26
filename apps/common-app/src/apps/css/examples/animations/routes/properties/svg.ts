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
  Group: {
    Component: svgAnimatedProperties.Group,
    name: 'Group',
  },
  Image: {
    Component: svgAnimatedProperties.Image,
    name: 'Image',
  },
  Line: {
    Component: svgAnimatedProperties.Line,
    name: 'Line',
  },
  LinearGradient: {
    Component: svgAnimatedProperties.LinearGradient,
    name: 'LinearGradient',
  },
  Path: {
    Component: svgAnimatedProperties.Path,
    name: 'Path',
  },
  RadialGradient: {
    Component: svgAnimatedProperties.RadialGradient,
    name: 'RadialGradient',
  },
  Rect: {
    Component: svgAnimatedProperties.Rect,
    name: 'Rect',
  },
  Text: {
    Component: svgAnimatedProperties.Text,
    name: 'Text',
  },
} satisfies Routes;
