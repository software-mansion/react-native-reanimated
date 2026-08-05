'use strict';
import type { NumberProp } from 'react-native-svg';

import type { ValueProcessor } from '../../../../common';
import { isLength } from '../../../utils';

export const ERROR_MESSAGES = {
  invalidDashArray: (value: unknown) =>
    `Invalid stroke dash array value: ${JSON.stringify(value)}`,
};

export const processStrokeDashArray: ValueProcessor<
  NumberProp | readonly NumberProp[],
  (number | string)[] | 'none'
> = (value) => {
  let result: NumberProp[] = [];

  if (isLength(value)) {
    result = [value];
  } else if (Array.isArray(value)) {
    result = [...value];
  } else if (value === 'none') {
    return 'none';
  } else {
    throw new Error(`[Reanimated] ${ERROR_MESSAGES.invalidDashArray(value)}`);
  }

  // Per the SVG spec an odd-length dash array is repeated to an even length.
  // react-native-svg's extractStroke does this, but animated values bypass it
  // and an odd-length array crashes Android's DashPathEffect, so we repeat here.
  // https://www.w3.org/TR/fill-stroke-3/#valdef-stroke-dasharray-length-percentage
  if (result.length % 2 === 1) {
    result = result.concat(result);
  }

  if (__DEV__) {
    isValidDashArray(result);
  }

  return result;
};

const isValidDashArray = (value: NumberProp[]) => {
  if (!value.every(isLength)) {
    throw new Error(`[Reanimated] ${ERROR_MESSAGES.invalidDashArray(value)}`);
  }
};
