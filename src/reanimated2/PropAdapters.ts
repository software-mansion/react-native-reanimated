import { addWhitelistedNativeProps } from '../ConfigHelper';
import type { AdapterWorkletFunction } from './commonTypes';
import type { AnimatedPropsAdapterFunction } from './helperTypes';

// TODO TYPESCRIPT This is a temporary type to get rid of .d.ts file.
type createAnimatedPropAdapterType = (
  adapter: AnimatedPropsAdapterFunction,
  nativeProps?: string[]
) => AnimatedPropsAdapterFunction;

export const createAnimatedPropAdapter = ((
  adapter: AdapterWorkletFunction,
  nativeProps?: string[]
): AdapterWorkletFunction => {
  const nativePropsToAdd: { [key: string]: boolean } = {};
  // eslint-disable-next-line no-unused-expressions
  nativeProps?.forEach((prop) => {
    nativePropsToAdd[prop] = true;
  });
  addWhitelistedNativeProps(nativePropsToAdd);
  return adapter;
}) as createAnimatedPropAdapterType;
