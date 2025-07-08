'use strict';

import { logger } from './common';
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
  logger.warn(
    '`createAnimatedPropAdapter` is no longer necessary in Reanimated 4 and will be removed in next version. Please remove this call from your code and pass the adapter function directly.'
  );
  return adapter;
}
