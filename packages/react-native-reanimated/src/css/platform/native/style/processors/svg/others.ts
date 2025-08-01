'use strict';
import type { NumberProp } from 'react-native-svg';

import { ReanimatedError } from '../../../../../../common';
import { isNumber, isPercentage } from '../../../../../utils';
import type { ValueProcessor } from '../../types';

export const ERROR_MESSAGES = {
  invalidValue: (value: unknown) =>
    `Invalid value: ${JSON.stringify(value)}. Expected a number or a percentage string.`,
};

export const convertNumberPropToNumber: ValueProcessor<NumberProp, number> = (
  value
) => {
  if (isPercentage(value)) {
    return parseFloat(value) / 100;
  }
  if (isNumber(value)) {
    return value;
  }

  throw new ReanimatedError(ERROR_MESSAGES.invalidValue(value));
};
