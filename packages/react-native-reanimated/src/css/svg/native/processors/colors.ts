'use strict';
import type { ColorValue } from 'react-native';

import type { ValueProcessor } from '../../../../common';
import { type CSSColorValue, processColor } from '../../../native';

enum SVGBrushType {
  Rgba = 0,
  Transparent = 1,
  CurrentColor = 2,
}

export const processBrush: ValueProcessor<
  ColorValue | number,
  CSSColorValue
> = (value) => {
  if (value === 'none' || value === 'transparent') {
    return { colorType: SVGBrushType.Transparent };
  }
  if (value === 'currentColor') {
    return { colorType: SVGBrushType.CurrentColor };
  }

  return processColor(value);
};
