'use strict';
import type { ColorValue } from 'react-native';

import type { ValueProcessor } from '../../../../common';
import {
  processColor as processColorInternal,
  ReanimatedError,
} from '../../../../common';

export const ERROR_MESSAGES = {
  invalidColor: (color: Readonly<ColorValue | number>) =>
    `Invalid color value: ${String(color)}`,
};

export enum CSSColorType {
  Rgba = 0,
  Transparent = 1,
}

export type CSSColorValue = {
  type: number;
  value?: number | string;
};

export const processColor: ValueProcessor<
  ColorValue | number,
  CSSColorValue
> = (value) => {
  const normalizedColor = processColorInternal(value);

  if (normalizedColor === null) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidColor(value));
  }

  if (typeof value === 'number') {
    return { type: CSSColorType.Rgba, value: normalizedColor };
  }

  return { type: CSSColorType.Transparent };
};
