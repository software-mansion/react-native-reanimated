import type { CubicBezierEasingConfig } from './types';

export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): CubicBezierEasingConfig {
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
    throw new Error(
      `[Reanimated] Invalid x coordinates for cubic bezier easing points, they should be numbers between 0 and 1`
    );
  }

  return {
    name: 'cubicBezier',
    x1,
    y1,
    x2,
    y2,
  };
}
