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

enum CSSColorType {
  Rgba = 0,
  Transparent = 1,
}

export type CSSColorValue = {
  colorType: number;
  value?: number | string;
};

export const processColor: ValueProcessor<
  ColorValue | number,
  CSSColorValue
> = (value) => {
  const normalizedColor = processColorInternal(value);

  if (typeof normalizedColor === 'number') {
    return { colorType: CSSColorType.Rgba, value: normalizedColor };
  }

  if (normalizedColor === null) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidColor(value));
  }

  return { colorType: CSSColorType.Transparent };
};
