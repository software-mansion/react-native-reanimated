'use strict';
'worklet';
import { ColorProperties, processColorInitially } from '../../Colors';
import type { StyleProps } from '../../commonTypes';
import { IS_ANDROID } from '../constants';

export function processColor(color: unknown): number | null | undefined {
  'worklet';
  let normalizedColor = processColorInitially(color);
  if (normalizedColor === null || normalizedColor === undefined) {
    return undefined;
  }

  if (typeof normalizedColor !== 'number') {
    return null;
  }

  if (IS_ANDROID) {
    // Android use 32 bit *signed* integer to represent the color
    // We utilize the fact that bitwise operations in JS also operates on
    // signed 32 bit integers, so that we can use those to convert from
    // *unsigned* to *signed* 32bit int that way.
    normalizedColor = normalizedColor | 0x0;
  }

  return normalizedColor;
}

export function processColorsInProps(props: StyleProps) {
  'worklet';
  for (const key in props) {
    if (ColorProperties.includes(key)) {
      if (Array.isArray(props[key])) {
        props[key] = props[key].map((color: unknown) => processColor(color));
      } else {
        props[key] = processColor(props[key]);
      }
    }
  }
}
