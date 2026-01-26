'use strict';
export * from './colors';
export * from './others';
export { processSVGPath } from './path';
<<<<<<< HEAD
export * from './percentage';
=======
export {
  processSVGRadialGradientRadius,
  processSVGRadialGradientFocalX,
  processSVGRadialGradientFocalY,
} from './radialGradientCoords';
export { processSVGGradientStops } from './stops';
>>>>>>> a026fda457 (Start implementing the gradinet animations)
export { processStrokeDashArray } from './stroke';
