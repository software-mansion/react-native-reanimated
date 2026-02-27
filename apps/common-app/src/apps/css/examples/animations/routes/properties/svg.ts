/* eslint-disable perfectionist/sort-objects */
import { svgAnimatedProperties } from '@/apps/css/examples/animations/screens';
import type { Routes } from '@/apps/css/navigation/types';

export const svgPropertiesRoutes = {
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
  Components: {
    name: 'Components',
    routes: {
      Circle: {
        Component: svgAnimatedProperties.Circle,
        name: 'Circle',
      },
      Ellipse: {
        Component: svgAnimatedProperties.Ellipse,
        name: 'Ellipse',
      },
      Rect: {
        Component: svgAnimatedProperties.Rect,
        name: 'Rect',
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
      Polygon: {
        Component: svgAnimatedProperties.Polygon,
        name: 'Polygon',
      },
      Polyline: {
        Component: svgAnimatedProperties.Polyline,
        name: 'Polyline',
      },
      LinearGradient: {
        Component: svgAnimatedProperties.LinearGradient,
        name: 'LinearGradient',
      },
      RadialGradient: {
        Component: svgAnimatedProperties.RadialGradient,
        name: 'RadialGradient',
      },
      Group: {
        Component: svgAnimatedProperties.Group,
        name: 'Group',
      },
      Text: {
        Component: svgAnimatedProperties.Text,
        name: 'Text',
      },
    },
  },
} satisfies Routes;
