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
type LinearGradientValue = Extract<
  BackgroundImageValue,
  { type: 'linear-gradient' }
>;
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

type GradientValue = BackgroundImageValue | ConicGradientValue;

const DEFAULT_POSITION = { top: '50%', left: '50%' } as const;

export const processBackgroundImageWeb: ValueProcessor<
  string | readonly GradientValue[]
> = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  return value.map(processGradient).join(', ');
};

function processGradient(gradient: GradientValue): string {
  switch (gradient.type) {
    case 'linear-gradient':
      return processLinearGradient(gradient);
    case 'radial-gradient':
      return processRadialGradient(gradient);
    case 'conic-gradient':
      return processConicGradient(gradient);
  }
}

function processLinearGradient({ direction, colorStops }: LinearGradientValue) {
  const stops = processColorStops(colorStops, processLengthPositions);
  return `linear-gradient(${direction ?? 'to bottom'}, ${stops})`;
}

function processRadialGradient({
  shape = 'ellipse',
  size = 'farthest-corner',
  position = DEFAULT_POSITION,
  colorStops,
}: RadialGradientValue) {
  const shapeAndSize = processRadialShapeAndSize(shape, size);
  const stops = processColorStops(colorStops, processLengthPositions);
  return `radial-gradient(${shapeAndSize} at ${processGradientPosition(position)}, ${stops})`;
}

function processConicGradient({
  from = '0deg',
  position = DEFAULT_POSITION,
  colorStops,
}: ConicGradientValue) {
  const stops = processColorStops(colorStops, (positions) =>
    positions.join(' ')
  );
  return `conic-gradient(from ${from} at ${processGradientPosition(position)}, ${stops})`;
}

function processColorStops(
  colorStops: GradientValue['colorStops'],
  processPositions: (positions: readonly (string | number)[]) => string
) {
  return colorStops
    .map(({ color, positions }) => {
      const positionsString = positions ? processPositions(positions) : '';
      if (color == null) {
        return positionsString;
      }
      const processedColor = processColor(color) as string | undefined;
      return [processedColor, positionsString].filter(Boolean).join(' ');
    })
    .join(', ');
}

function processLengthPositions(positions: readonly (string | number)[]) {
  return positions.map((position) => maybeAddSuffix(position, 'px')).join(' ');
}

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
