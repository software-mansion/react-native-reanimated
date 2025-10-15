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

export const processColor: ValueProcessor<
  ColorValue | number,
  number | string
> = (value) => {
  const normalizedColor = processColorInternal(value);

  if (normalizedColor === null) {
    throw new ReanimatedError(ERROR_MESSAGES.invalidColor(value));
  }

  return normalizedColor;
};
