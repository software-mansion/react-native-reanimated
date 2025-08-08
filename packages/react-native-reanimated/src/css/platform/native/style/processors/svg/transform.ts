'use strict';
import type { ColumnMajorTransformMatrix } from 'react-native-svg';

import type { TransformsArray } from '../../../../../types';
import { isNumberArray } from '../../../../../utils';
import type { ValueProcessor } from '../../types';
import { processTransform } from '../base';

export const processTransformSVG: ValueProcessor<
  ColumnMajorTransformMatrix | TransformsArray | string
> = (value) => {
  if (isNumberArray(value) && value.length === 6) {
    return [{ matrix: value }];
  }

  return processTransform(value);
};
