'use strict';
import type {
  AnimatedPropsAdapterFunction,
  AnimatedPropsAdapterWorklet,
} from './commonTypes';

// @ts-expect-error This overload is required by our API.
export function createAnimatedPropAdapter(
  adapter: AnimatedPropsAdapterFunction,
  nativeProps?: string[]
): AnimatedPropsAdapterFunction;

export function createAnimatedPropAdapter(
  adapter: AnimatedPropsAdapterWorklet,
  _nativeProps?: string[]
): AnimatedPropsAdapterWorklet {
  // Do nothing
  return adapter;
}
