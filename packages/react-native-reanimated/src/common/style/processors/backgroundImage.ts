'use strict';
import type { ViewStyle } from 'react-native';

import type { ValueProcessor, ValueProcessorContext } from '../../types';
import { getAngleInDegrees } from '../../utils';
import type { ProcessedColor } from './colors';
import { processColor } from './colors';

type BackgroundImageStyleValue = NonNullable<ViewStyle['backgroundImage']>;
type BackgroundImageValue = Exclude<BackgroundImageStyleValue, string>[number];
type RadialGradientValue = Extract<
  BackgroundImageValue,
  { type: 'radial-gradient' }
>;
type RadialGradientShape = RadialGradientValue['shape'];
type RadialGradientSize = RadialGradientValue['size'];
type RadialGradientPosition = RadialGradientValue['position'];

const WHITESPACE_NORMALIZE_REGEX = /\s+/g;

const DEFAULT_DIRECTION = { type: 'angle', value: 180 } as const;
const DEFAULT_RADIAL_SHAPE = 'ellipse';
const DEFAULT_RADIAL_SIZE = 'farthest-corner';
const DEFAULT_RADIAL_POSITION = { top: '50%', left: '50%' };

const RADIAL_SIZE_KEYWORDS = [
  'closest-side',
  'closest-corner',
  'farthest-side',
  'farthest-corner',
];

export const ERROR_MESSAGES = {
  invalidDirection(direction: string) {
    'worklet';
    return `Invalid direction "${direction}" in background image.`;
  },
  invalidPosition(position: unknown) {
    'worklet';
    return `Invalid position "${String(position)}" in background image color stop.`;
  },
  invalidShape(shape: string) {
    'worklet';
    return `Invalid shape "${shape}" in radial gradient.`;
  },
  invalidSize(size: unknown) {
    'worklet';
    return `Invalid size ${JSON.stringify(size)} in radial gradient.`;
  },
};

type ProcessedDirection =
  | { type: 'angle'; value: number }
  | { type: 'keyword'; value: string };

type ProcessedColorStop = {
  color: ProcessedColor | null;
  position: number | string | null;
};

export type ProcessedBackgroundImageValue =
  | {
      type: 'linear-gradient';
      direction: ProcessedDirection;
      colorStops: ProcessedColorStop[];
    }
  | {
      type: 'radial-gradient';
      shape: RadialGradientShape;
      size: RadialGradientSize;
      position: RadialGradientPosition;
      colorStops: ProcessedColorStop[];
    };

const getDirectionForKeyword = (
  direction: string
): ProcessedDirection | null => {
  'worklet';
  switch (direction.replace(WHITESPACE_NORMALIZE_REGEX, ' ')) {
    case 'to top':
      return { type: 'angle', value: 0 };
    case 'to right':
      return { type: 'angle', value: 90 };
    case 'to bottom':
      return { type: 'angle', value: 180 };
    case 'to left':
      return { type: 'angle', value: 270 };
    case 'to top right':
    case 'to right top':
      return { type: 'keyword', value: 'to top right' };
    case 'to bottom right':
    case 'to right bottom':
      return { type: 'keyword', value: 'to bottom right' };
    case 'to top left':
    case 'to left top':
      return { type: 'keyword', value: 'to top left' };
    case 'to bottom left':
    case 'to left bottom':
      return { type: 'keyword', value: 'to bottom left' };
    default:
      return null;
  }
};

const processDirection = (direction?: string): ProcessedDirection => {
  'worklet';
  if (direction == null) {
    return DEFAULT_DIRECTION;
  }

  const normalized = direction.toLowerCase();
  const parsed = getAngleInDegrees(normalized);

  if (parsed !== null) {
    return { type: 'angle', value: parsed };
  }

  const keywordDirection = getDirectionForKeyword(normalized);
  if (keywordDirection === null) {
    throw new Error(
      `[Reanimated] ${ERROR_MESSAGES.invalidDirection(direction)}`
    );
  }
  return keywordDirection;
};

const isValidPosition = (position: unknown): position is number | string => {
  'worklet';
  return (
    typeof position === 'number' ||
    (typeof position === 'string' && position.endsWith('%'))
  );
};

const processColorStops = (
  colorStops: BackgroundImageValue['colorStops'],
  context?: ValueProcessorContext
): ProcessedColorStop[] => {
  'worklet';
  const result: ProcessedColorStop[] = [];

  for (const colorStop of colorStops) {
    const { color, positions } = colorStop;

    if (color == null && positions?.length === 1) {
      if (!isValidPosition(positions[0])) {
        throw new Error(
          `[Reanimated] ${ERROR_MESSAGES.invalidPosition(positions[0])}`
        );
      }
      result.push({ color: null, position: positions[0] });
      continue;
    }

    const processedColor = processColor(color, context);

    if (!positions?.length) {
      result.push({ color: processedColor, position: null });
      continue;
    }

    for (const position of positions) {
      if (!isValidPosition(position)) {
        throw new Error(
          `[Reanimated] ${ERROR_MESSAGES.invalidPosition(position)}`
        );
      }
      result.push({ color: processedColor, position });
    }
  }

  return result;
};

const processRadialSize = (size?: RadialGradientSize): RadialGradientSize => {
  'worklet';
  if (size == null) {
    return DEFAULT_RADIAL_SIZE;
  }
  if (typeof size === 'string' && RADIAL_SIZE_KEYWORDS.includes(size)) {
    return size;
  }
  if (typeof size === 'object' && size.x != null && size.y != null) {
    return { x: size.x, y: size.y };
  }
  throw new Error(`[Reanimated] ${ERROR_MESSAGES.invalidSize(size)}`);
};

const processRadialShape = (
  shape?: RadialGradientShape
): RadialGradientShape => {
  'worklet';
  if (shape == null) {
    return DEFAULT_RADIAL_SHAPE;
  }
  if (shape !== 'circle' && shape !== 'ellipse') {
    throw new Error(`[Reanimated] ${ERROR_MESSAGES.invalidShape(shape)}`);
  }
  return shape;
};

export const processBackgroundImage: ValueProcessor<
  BackgroundImageStyleValue,
  ProcessedBackgroundImageValue[] | undefined
> = (value, context) => {
  'worklet';
  if (typeof value === 'string' || !Array.isArray(value)) {
    return;
  }

  const result: ProcessedBackgroundImageValue[] = [];

  for (const backgroundImage of value) {
    const colorStops = processColorStops(backgroundImage.colorStops, context);

    if (backgroundImage.type === 'linear-gradient') {
      result.push({
        type: 'linear-gradient',
        direction: processDirection(backgroundImage.direction),
        colorStops,
      });
    } else if (backgroundImage.type === 'radial-gradient') {
      result.push({
        type: 'radial-gradient',
        shape: processRadialShape(backgroundImage.shape),
        size: processRadialSize(backgroundImage.size),
        position: backgroundImage.position ?? { ...DEFAULT_RADIAL_POSITION },
        colorStops,
      });
    }
  }

  return result;
};
