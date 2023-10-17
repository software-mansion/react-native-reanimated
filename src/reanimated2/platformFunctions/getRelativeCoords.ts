'use strict';
import type { Component } from 'react';
import { measure } from './measure';
import type { AnimatedRef } from '../hook/commonTypes';

export interface ComponentCoords {
  x: number;
  y: number;
}

/**
 * Given an absolute position and a component ref, returns the relative
 * position in the component's local coordinate space.
 */
export function getRelativeCoords(
  parentAnimatedRef: AnimatedRef<Component>,
  absoluteX: number,
  absoluteY: number
): ComponentCoords | null {
  'worklet';
  const parentCoords = measure(parentAnimatedRef);
  if (parentCoords === null) {
    return null;
  }
  return {
    x: absoluteX - parentCoords.x,
    y: absoluteY - parentCoords.y,
  };
}
