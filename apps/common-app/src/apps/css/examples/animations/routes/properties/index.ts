import type { Routes } from '@/apps/css/navigation/types';

import { baseAnimatedPropertiesRoutes } from './base';
import { svgAnimatedPropertiesRoutes } from './svg';

// TODO - maybe add custom route cards with animations
export const animatedPropertiesRoutes = {
  BaseAnimatedProperties: {
    flatten: true,
    name: 'Base Animated Properties',
    routes: baseAnimatedPropertiesRoutes,
  },
  SVGAnimatedProperties: {
    flatten: true,
    name: 'SVG Animated Properties',
    routes: svgAnimatedPropertiesRoutes,
  },
} satisfies Routes;
