'use strict';

import type { EasingFunctionFactory } from '../../Easing';

type BezierClosure = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  Bezier: () => void;
};

// Those are the easings that can be implemented using Bezier curves.
// Others should be done as CSS animations
export const WebEasings = {
  linear: [0, 0, 1, 1],
  ease: [0.42, 0, 1, 1],
  quad: [0.11, 0, 0.5, 0],
  cubic: [0.32, 0, 0.67, 0],
  sin: [0.12, 0, 0.39, 0],
  circle: [0.55, 0, 1, 0.45],
  exp: [0.7, 0, 0.84, 0],
};

export function getEasingByName(easingName: WebEasingsNames) {
  return `cubic-bezier(${WebEasings[easingName].toString()})`;
}

export function maybeGetBezierEasing(
  easing: EasingFunctionFactory
): null | string {
  if (typeof easing === 'string') {
    return null;
  }

  if (!('factory' in easing)) {
    return null;
  }

  const easingFactory = easing.factory;

  if (!('__closure' in easingFactory)) {
    return null;
  }

  const closure = easingFactory.__closure as BezierClosure;

  if (!('Bezier' in closure)) {
    return null;
  }

  return `cubic-bezier(${closure.x1}, ${closure.y1}, ${closure.x2}, ${closure.y2})`;
}

export type WebEasingsNames = keyof typeof WebEasings;
