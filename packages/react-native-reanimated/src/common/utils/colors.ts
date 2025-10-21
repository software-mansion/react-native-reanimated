'use strict';
import type { ColorValue } from 'react-native';

import { processColor } from '../style';

export function opacifyColor(
  color: ColorValue,
  opacity: number
): string | null {
  'worklet';
  const colorNumber = processColor(color);
  if (colorNumber == null) {
    return null;
  }

  const a = (colorNumber >> 24) & 0xff;
  const r = (colorNumber >> 16) & 0xff;
  const g = (colorNumber >> 8) & 0xff;
  const b = colorNumber & 0xff;

  // Combine the existing alpha with the new opacity
  const newAlpha = (a / 255) * opacity;

  return `rgba(${r}, ${g}, ${b}, ${newAlpha})`;
}
