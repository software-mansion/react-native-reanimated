'use strict';
import type { ValueProcessor } from '../../types';

export const ERROR_MESSAGES = {
  unsupportedObjectFit(value: string) {
    'worklet';
    return `Unsupported objectFit: ${value}. Expected one of: contain, cover, fill, scale-down, none.`;
  },
};

const OBJECT_FIT_TO_RESIZE_MODE: Record<string, string> = {
  contain: 'contain',
  cover: 'cover',
  fill: 'stretch',
  'scale-down': 'contain',
  none: 'none',
};

export const processObjectFit: ValueProcessor<string> = (value) => {
  'worklet';
  if (!Object.prototype.hasOwnProperty.call(OBJECT_FIT_TO_RESIZE_MODE, value)) {
    throw new Error(
      `[Reanimated] ${ERROR_MESSAGES.unsupportedObjectFit(value)}`
    );
  }
  return { resizeMode: OBJECT_FIT_TO_RESIZE_MODE[value] };
};
