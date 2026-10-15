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
  const resizeMode = OBJECT_FIT_TO_RESIZE_MODE[value as string];
  if (resizeMode === undefined) {
    throw new Error(
      `[Reanimated] ${ERROR_MESSAGES.unsupportedObjectFit(value as string)}`
    );
  }
  return { resizeMode };
};
