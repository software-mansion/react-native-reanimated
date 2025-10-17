'use strict';
import type { ColorValue } from 'react-native';

import type { ValueProcessor } from '../../../../common';
import { type CSSColorValue, processColor } from '../../../native';

enum SVGBrushType {
  Rgba = 0,
  Transparent = 1,
  CurrentColor = 2,
  UrlId = 3,
  ContextFill = 4,
  ContextStroke = 5,
}

const URL_ID_PATTERN = /^url\(#(.+)\)$/;

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
  if (value === 'context-fill') {
    return { colorType: SVGBrushType.ContextFill };
  }
  if (value === 'context-stroke') {
    return { colorType: SVGBrushType.ContextStroke };
  }

  const brush = typeof value === 'string' && value.match(URL_ID_PATTERN);
  if (brush) {
    return { colorType: SVGBrushType.UrlId, value: brush[1] };
  }

  return processColor(value);
};
