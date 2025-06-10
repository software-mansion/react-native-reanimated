'use strict';
import type {
  AnimatedPropsAdapterFunction,
  AnimatedPropsAdapterWorklet,
} from './commonTypes';
import { addWhitelistedNativeProps } from './ConfigHelper';

// @ts-expect-error This overload is required by our API.
export function createAnimatedPropAdapter(
  adapter: AnimatedPropsAdapterFunction,
  nativeProps?: string[]
): AnimatedPropsAdapterFunction;

export function createAnimatedPropAdapter(
  adapter: AnimatedPropsAdapterWorklet,
  nativeProps?: string[]
): AnimatedPropsAdapterWorklet {
  const nativePropsToAdd: { [key: string]: boolean } = {};
  nativeProps?.forEach((prop) => {
    nativePropsToAdd[prop] = true;
  });
  addWhitelistedNativeProps(nativePropsToAdd);
  return adapter;
}
