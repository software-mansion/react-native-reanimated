'use strict';
'worklet';
import type { BoxShadowValue } from 'react-native';

import { IS_ANDROID } from '../constants';
import { ReanimatedError } from '../errors';
import type { ValueProcessor } from '../types';
import { maybeAddSuffix, parseBoxShadowString } from '../utils';
import { processColor } from './colors';

const ERROR_MESSAGES = {
  notArrayObject: (value: object) =>
    `Box shadow value must be a string or an array of shadow objects (e.g. [{ offsetX, offsetY, color }]). Received: ${JSON.stringify(value)}.`,

  invalidColor: (color: string, boxShadow: string) =>
    `Invalid color "${color}" in box shadow "${boxShadow}".`,
};

export type ProcessedBoxShadowValue = {
  offsetX: number;
  offsetY: number;
  blurRadius?: number;
  color?: number;
  spreadDistance?: number;
  inset?: boolean;
};

const parseBlurRadius = (value: string) => {
  if (IS_ANDROID) {
    // Android crashes when blurRadius is smaller than 1
    return Math.max(parseFloat(value), 1);
  }
  return parseFloat(value);
};

export const processBoxShadowNative: ValueProcessor<
  ReadonlyArray<BoxShadowValue> | string,
  ProcessedBoxShadowValue[]
> = (value) => {
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

export const processBoxShadowWeb: ValueProcessor<
  string | ReadonlyArray<BoxShadowValue>,
  string
> = (value) => {
  const parsedShadow =
    typeof value === 'string' ? parseBoxShadowString(value) : value;

  return parsedShadow
    .map(
      ({
        offsetX,
        offsetY,
        color = '#000',
        blurRadius = '',
        spreadDistance = '',
        inset = '',
      }) =>
        [
          maybeAddSuffix(offsetX, 'px'),
          maybeAddSuffix(offsetY, 'px'),
          maybeAddSuffix(blurRadius, 'px'),
          maybeAddSuffix(spreadDistance, 'px'),
          color,
          inset ? 'inset' : '',
        ]
          .filter(Boolean)
          .join(' ')
    )
    .join(', ');
};
