'use strict';
import type { ColorValue, ViewStyle } from 'react-native';

import { isNumber, maybeAddSuffix } from '../../../utils';
import type { ValueProcessor } from '../types';
import { processColor } from './colors';

type BackgroundImageStyleValue = NonNullable<
  ViewStyle[Extract<
    keyof ViewStyle,
    'backgroundImage' | 'experimental_backgroundImage'
  >]
>;
type BackgroundImageValue = Exclude<BackgroundImageStyleValue, string>[number];
type RadialGradientValue = Extract<
  BackgroundImageValue,
  { type: 'radial-gradient' }
>;

type ConicGradientValue = {
  type: 'conic-gradient';
  from?: string;
  position?: RadialGradientValue['position'];
  colorStops: ReadonlyArray<
    | { color: ColorValue; positions?: readonly string[] }
    | { color?: null; positions: readonly [string] }
  >;
};

const DEFAULT_POSITION = { top: '50%', left: '50%' } as const;

const processColorStops = ({
  colorStops,
  type,
}: BackgroundImageValue | ConicGradientValue) =>
  colorStops
    .map(({ color, positions }) => {
      const positionsString =
        (type === 'conic-gradient'
          ? positions?.join(' ')
          : positions
              ?.map((position) => maybeAddSuffix(position, 'px'))
              .join(' ')) ?? '';
      if (color == null) {
        return positionsString;
      }
      const processedColor = processColor(color) as string | undefined;
      return [processedColor, positionsString].filter(Boolean).join(' ');
    })
    .join(', ');

const processRadialShapeAndSize = (
  shape: RadialGradientValue['shape'],
  size: RadialGradientValue['size']
) => {
  if (typeof size === 'string') {
    return `${shape} ${size}`;
  }
  if (shape === 'circle' && isNumber(size.x) && isNumber(size.y)) {
    return `circle ${Math.max(size.x, size.y)}px`;
  }
  return `ellipse ${maybeAddSuffix(size.x, 'px')} ${maybeAddSuffix(size.y, 'px')}`;
};

const processGradientPosition = (position: RadialGradientValue['position']) =>
  Object.entries(position)
    .map(([edge, offset]) => `${edge} ${maybeAddSuffix(offset, 'px')}`)
    .join(' ');

export const processBackgroundImageWeb: ValueProcessor<
  string | readonly (BackgroundImageValue | ConicGradientValue)[]
> = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  return value
    .map((backgroundImage) => {
      const colorStops = processColorStops(backgroundImage);
      if (backgroundImage.type === 'linear-gradient') {
        return `linear-gradient(${backgroundImage.direction ?? 'to bottom'}, ${colorStops})`;
      }
      if (backgroundImage.type === 'conic-gradient') {
        const { from = '0deg', position = DEFAULT_POSITION } = backgroundImage;
        return `conic-gradient(from ${from} at ${processGradientPosition(position)}, ${colorStops})`;
      }
      const {
        shape = 'ellipse',
        size = 'farthest-corner',
        position = DEFAULT_POSITION,
      } = backgroundImage;
      return `radial-gradient(${processRadialShapeAndSize(shape, size)} at ${processGradientPosition(position)}, ${colorStops})`;
    })
    .join(', ');
};
