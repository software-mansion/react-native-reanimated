'use strict';
import type { ViewStyle } from 'react-native';

import { maybeAddSuffix } from '../../../utils';
import type { ValueProcessor } from '../types';
import { processColor } from './colors';

type BackgroundImageStyleValue = NonNullable<ViewStyle['backgroundImage']>;
type BackgroundImageValue = Exclude<BackgroundImageStyleValue, string>[number];
type RadialGradientValue = Extract<
  BackgroundImageValue,
  { type: 'radial-gradient' }
>;

const processColorStops = (colorStops: BackgroundImageValue['colorStops']) =>
  colorStops
    .map(({ color, positions }) => {
      const positionsString =
        positions
          ?.map((position) => maybeAddSuffix(position, 'px'))
          .join(' ') ?? '';
      if (color == null) {
        return positionsString;
      }
      const processedColor = processColor(color) as string | undefined;
      return [processedColor, positionsString].filter(Boolean).join(' ');
    })
    .join(', ');

const processRadialSize = (
  shape: RadialGradientValue['shape'],
  size: RadialGradientValue['size']
) => {
  if (typeof size === 'string') {
    return size;
  }
  const x = maybeAddSuffix(size.x, 'px');
  return shape === 'circle' ? x : `${x} ${maybeAddSuffix(size.y, 'px')}`;
};

const processRadialPosition = (position: RadialGradientValue['position']) =>
  Object.entries(position)
    .map(([edge, offset]) => `${edge} ${maybeAddSuffix(offset, 'px')}`)
    .join(' ');

export const processBackgroundImageWeb: ValueProcessor<
  BackgroundImageStyleValue
> = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  return value
    .map((backgroundImage) => {
      const colorStops = processColorStops(backgroundImage.colorStops);
      if (backgroundImage.type === 'linear-gradient') {
        return `linear-gradient(${backgroundImage.direction ?? 'to bottom'}, ${colorStops})`;
      }
      const {
        shape = 'ellipse',
        size = 'farthest-corner',
        position = { top: '50%', left: '50%' },
      } = backgroundImage;
      return `radial-gradient(${shape} ${processRadialSize(shape, size)} at ${processRadialPosition(position)}, ${colorStops})`;
    })
    .join(', ');
};
