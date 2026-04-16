import type { Routes } from '@/apps/css/navigation/types';

import { basePropertiesRoutes } from './base';
import { svgPropertiesRoutes } from './svg';

// TODO - maybe add custom route cards with animations
export const animatedPropertiesRoutes = {
  BaseProperties: {
    flatten: true,
    name: 'Base Properties',
    routes: basePropertiesRoutes,
  },
  SVGProperties: {
    flatten: true,
    name: 'SVG Properties',
    routes: svgPropertiesRoutes,
  },
} satisfies Routes;
