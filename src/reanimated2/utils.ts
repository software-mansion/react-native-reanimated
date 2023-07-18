import type { Component } from 'react';
import { measure } from './NativeMethods';
import type { AnimatedRef } from './hook/commonTypes';
import type { SharedValue } from './commonTypes';
import { isWeb } from './PlatformChecker';

export const IS_REDUCED_MOTION = isWeb()
  ? !window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  : global._REANIMATED_IS_REDUCED_MOTION ?? false;

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

export function isSharedValue<T>(value: any): value is SharedValue<T> {
  'worklet';
  return value?._isReanimatedSharedValue === true;
}
