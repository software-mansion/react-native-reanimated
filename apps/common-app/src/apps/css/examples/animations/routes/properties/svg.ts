import { svgAnimatedProperties } from '@/apps/css/examples/animations/screens';
import type { Routes } from '@/apps/css/navigation/types';

export const svgPropertiesRoutes = {
  Circle: {
    name: 'Circle',
    Component: svgAnimatedProperties.Circle,
  },
} satisfies Routes;
