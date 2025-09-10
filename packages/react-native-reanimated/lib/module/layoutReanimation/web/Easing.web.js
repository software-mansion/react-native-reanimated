'use strict';

// Those are the easings that can be implemented using Bezier curves.
// Others should be done as CSS animations
export const WebEasings = {
  linear: [0, 0, 1, 1],
  ease: [0.42, 0, 1, 1],
  quad: [0.11, 0, 0.5, 0],
  cubic: [0.32, 0, 0.67, 0],
  sin: [0.12, 0, 0.39, 0],
  circle: [0.55, 0, 1, 0.45],
  exp: [0.7, 0, 0.84, 0]
};
export function getEasingByName(easingName) {
  return `cubic-bezier(${WebEasings[easingName].toString()})`;
}
export function maybeGetBezierEasing(easing) {
  if (!('factory' in easing)) {
    return null;
  }
  const easingFactory = easing.factory;
  if (!('__closure' in easingFactory)) {
    return null;
  }
  const closure = easingFactory.__closure;
  if (!('Bezier' in closure)) {
    return null;
  }
  return `cubic-bezier(${closure.x1}, ${closure.y1}, ${closure.x2}, ${closure.y2})`;
}
//# sourceMappingURL=Easing.web.js.map