'use strict';
import type { BoxShadowValue } from 'react-native';

import type { ValueProcessor } from '../../types';
import { parseBoxShadowString } from '../../utils';
import { processColor } from './colors';

const ERROR_MESSAGES = {
  notArrayObject(value: object) {
    'worklet';
    return `Box shadow value must be a string or an array of shadow objects (e.g. [{ offsetX, offsetY, color }]). Received: ${JSON.stringify(value)}.`;
  },
};

export type ProcessedBoxShadowValue = {
  offsetX: number;
  offsetY: number;
  blurRadius?: number;
  color?: number;
  spreadDistance?: number;
  inset?: boolean;
};

export const processBoxShadow: ValueProcessor<
  ReadonlyArray<BoxShadowValue> | string,
  ProcessedBoxShadowValue[]
> = (value, context) => {
  'worklet';
  if (value === 'none') {
    return [];
  }

  const parsedShadow =
    typeof value === 'string' ? parseBoxShadowString(value) : value;

  if (!Array.isArray(parsedShadow)) {
    throw new Error(
      `[Reanimated] ${ERROR_MESSAGES.notArrayObject(parsedShadow)}`
    );
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

    return {
      ...rest,
      blurRadius: parseFloat(blurRadius as string),
      color: processColor(color, context),
      offsetX: parseFloat(offsetX as string),
      offsetY: parseFloat(offsetY as string),
      spreadDistance: parseFloat(spreadDistance as string),
    };
  });
};
