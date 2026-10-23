'use strict';
import type { ImageStyle } from 'react-native';

import type { StyleProps } from '../../../commonTypes';
import type { ValueProcessor } from '../../types';

type ObjectFit = NonNullable<ImageStyle['objectFit']>;
type ResizeMode = NonNullable<ImageStyle['resizeMode']>;

export const ERROR_MESSAGES = {
  unsupportedObjectFit(value: string) {
    'worklet';
    return `Unsupported objectFit: ${value}. Expected one of: contain, cover, fill, scale-down, none.`;
  },
};

const OBJECT_FIT_TO_RESIZE_MODE = {
  contain: 'contain',
  cover: 'cover',
  fill: 'stretch',
  'scale-down': 'center',
  none: 'none',
} as const satisfies Record<ObjectFit, ResizeMode>;

const RESIZE_MODE_TO_OBJECT_FIT = {
  contain: 'contain',
  cover: 'cover',
  stretch: 'fill',
  center: 'scale-down',
  none: 'none',
  repeat: undefined,
} as const satisfies Record<ResizeMode, ObjectFit | undefined>;

export const processObjectFit: ValueProcessor<string, ResizeMode> = (value) => {
  'worklet';
  if (!Object.prototype.hasOwnProperty.call(OBJECT_FIT_TO_RESIZE_MODE, value)) {
    throw new Error(
      `[Reanimated] ${ERROR_MESSAGES.unsupportedObjectFit(value)}`
    );
  }
  return {
    resizeMode: OBJECT_FIT_TO_RESIZE_MODE[value as ObjectFit],
  };
};

export function unprocessObjectFit(props: StyleProps) {
  if ('resizeMode' in props) {
    // @ts-ignore props is readonly
    props.objectFit = RESIZE_MODE_TO_OBJECT_FIT[props.resizeMode as ResizeMode];
  }
}
