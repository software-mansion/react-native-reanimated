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
  exp: [0.7, 0, 0.84, 0],
};

export type WebEasingsNames = keyof typeof WebEasings;
