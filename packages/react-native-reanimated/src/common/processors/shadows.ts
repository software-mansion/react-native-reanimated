'use strict';
import type { BoxShadowValue } from 'react-native';

import { processColor } from '../../Colors';
import { ReanimatedError } from '../../errors';
import { IS_ANDROID } from '../constants';
import type { ValueProcessor } from '../types';
import { parseBoxShadowString } from '../utils';

const ERROR_MESSAGES = {
  notArrayObject: (value: object) => {
    'worklet';
    const errMsg = `Box shadow value must be an array of shadow objects. Received: ${JSON.stringify(value)}`;
    return errMsg;
  },
  invalidColor: (color: string, boxShadow: string) => {
    'worklet';
    const errMsg = `Invalid color "${color}" in box shadow "${boxShadow}".`;
    return errMsg;
  },
};

export type ProcessedBoxShadowValue = {
  blurRadius?: number;
  color?: number;
  offsetX?: number;
  offsetY?: number;
  spreadDistance?: number;
  inset?: boolean;
};

const parseBlurRadius = (value: string) => {
  'worklet';
  if (IS_ANDROID) {
    // Android crashes when blurRadius is smaller than 1
    return Math.max(parseFloat(value), 1);
  }
  return parseFloat(value);
};

export const processBoxShadow: ValueProcessor<
  ReadonlyArray<BoxShadowValue> | string,
  ProcessedBoxShadowValue[]
> = (value) => {
  'worklet';
  if (value === 'none') {
    return;
  }

  const parsedShadow =
    typeof value === 'string' ? parseBoxShadowString(value) : value;

  if (!Array.isArray(parsedShadow)) {
    throw new ReanimatedError(ERROR_MESSAGES.notArrayObject(parsedShadow));
  }

  return parsedShadow.map<ProcessedBoxShadowValue>((shadow) => {
    const {
      color = '#000',
      offsetX = 0,
      offsetY = 0,
      spreadDistance = 0,
      blurRadius = 0,
      ...rest
    } = shadow;
    const processedColor = processColor(color);

    if (processedColor === null) {
      throw new ReanimatedError(
        ERROR_MESSAGES.invalidColor(color, JSON.stringify(shadow))
      );
    }

    return {
      ...rest,
      blurRadius: parseBlurRadius(blurRadius as string),
      color: processedColor,
      offsetX: parseFloat(offsetX as string),
      offsetY: parseFloat(offsetY as string),
      spreadDistance: parseFloat(spreadDistance as string),
    };
  });
};
