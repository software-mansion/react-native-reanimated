'use strict';
import type { ViewStyle } from 'react-native';

import type { ValueProcessor, ValueProcessorContext } from '../../types';
import {
  CSS_NUMBER_PATTERN,
  getAngleInDegrees,
  isPercentage,
  splitByComma,
  splitByWhitespace,
} from '../../utils';
import type { ProcessedColor } from './colors';
import { processColor, processColorNumber } from './colors';

type BackgroundImageStyleValue = NonNullable<ViewStyle['backgroundImage']>;
type BackgroundImageValue = Exclude<BackgroundImageStyleValue, string>[number];
type RadialGradientValue = Extract<
  BackgroundImageValue,
  { type: 'radial-gradient' }
>;
type RadialGradientShape = RadialGradientValue['shape'];
type RadialGradientSize = RadialGradientValue['size'];
type RadialGradientPosition = RadialGradientValue['position'];

const NEWLINE_REGEX = /\n/g;
const WHITESPACE_NORMALIZE_REGEX = /\s+/g;
const GRADIENT_REGEX = /^(linear|radial)-gradient\(((?:\([^)]*\)|[^()])*)\)/;
const COLOR_STOP_PARTS_REGEX = /\S+\([^)]*\)|\S+/g;
const PX_LENGTH_REGEX = new RegExp(`^${CSS_NUMBER_PATTERN}px$`);
const LINEAR_GRADIENT_DIRECTION_REGEX =
  /^to\s+(?:top|bottom|left|right)(?:\s+(?:top|bottom|left|right))?/;

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

const parseDirection = (direction: string): ProcessedDirection | null => {
  'worklet';
  const normalized = direction.toLowerCase();
  const angle = getAngleInDegrees(normalized);
  if (angle !== null) {
    return { type: 'angle', value: angle };
  }
  return getDirectionForKeyword(normalized);
};

const processDirection = (direction?: string): ProcessedDirection => {
  'worklet';
  if (direction == null) {
    return DEFAULT_DIRECTION;
  }

  const parsed = parseDirection(direction);
  if (parsed === null) {
    throw new Error(
      `[Reanimated] ${ERROR_MESSAGES.invalidDirection(direction)}`
    );
  }
  return parsed;
};

const isValidPosition = (position: unknown): position is number | string => {
  'worklet';
  return typeof position === 'number' || isPercentage(position);
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

const getPositionFromCSSValue = (value: string): number | string | null => {
  'worklet';
  if (isPercentage(value)) {
    return value;
  }
  if (PX_LENGTH_REGEX.test(value)) {
    return parseFloat(value);
  }
  return null;
};

const parseCSSColor = (
  color: string,
  context?: ValueProcessorContext
): ProcessedColor | null => {
  'worklet';
  if (processColorNumber(color) === null) {
    return null;
  }
  return processColor(color, context);
};

const isLengthOrPercentageToken = (token: string): boolean => {
  'worklet';
  return token.endsWith('px') || token.endsWith('%');
};

const parseColorStopsCSSString = (
  parts: string[],
  context?: ValueProcessorContext
): ProcessedColorStop[] | null => {
  'worklet';
  const stops = splitByComma(parts.join(','));
  const result: ProcessedColorStop[] = [];
  let previousWasHint = false;

  for (let i = 0; i < stops.length; i++) {
    const colorStopParts = stops[i].trim().match(COLOR_STOP_PARTS_REGEX);
    if (colorStopParts === null) {
      return null;
    }

    if (colorStopParts.length === 3) {
      const color = parseCSSColor(colorStopParts[0], context);
      const position1 = getPositionFromCSSValue(colorStopParts[1]);
      const position2 = getPositionFromCSSValue(colorStopParts[2]);
      if (color === null || position1 === null || position2 === null) {
        return null;
      }
      result.push({ color, position: position1 });
      result.push({ color, position: position2 });
      previousWasHint = false;
    } else if (colorStopParts.length === 2) {
      const color = parseCSSColor(colorStopParts[0], context);
      const position = getPositionFromCSSValue(colorStopParts[1]);
      if (color === null || position === null) {
        return null;
      }
      result.push({ color, position });
      previousWasHint = false;
    } else if (colorStopParts.length === 1) {
      const position = getPositionFromCSSValue(colorStopParts[0]);
      if (position !== null) {
        if (previousWasHint || i === 0 || i === stops.length - 1) {
          return null;
        }
        result.push({ color: null, position });
        previousWasHint = true;
      } else {
        const color = parseCSSColor(colorStopParts[0], context);
        if (color === null) {
          return null;
        }
        result.push({ color, position: null });
        previousWasHint = false;
      }
    } else {
      return null;
    }
  }

  return result;
};

const parseLinearGradientCSSString = (
  content: string,
  context?: ValueProcessorContext
): ProcessedBackgroundImageValue | null => {
  'worklet';
  const parts = content.split(',');
  const firstPart = parts[0].trim();
  let direction: ProcessedDirection = DEFAULT_DIRECTION;

  if (
    getAngleInDegrees(firstPart) !== null ||
    LINEAR_GRADIENT_DIRECTION_REGEX.test(firstPart)
  ) {
    const parsed = parseDirection(firstPart);
    if (parsed === null) {
      return null;
    }
    direction = parsed;
    parts.shift();
  }

  const colorStops = parseColorStopsCSSString(parts, context);
  if (colorStops === null) {
    return null;
  }

  return { type: 'linear-gradient', direction, colorStops };
};

const HORIZONTAL_POSITION_KEYWORDS: Record<string, string> = {
  left: '0%',
  center: '50%',
  right: '100%',
};
const VERTICAL_POSITION_KEYWORDS: Record<string, string> = {
  top: '0%',
  center: '50%',
  bottom: '100%',
};

const getKeywordPosition = (
  keywords: Record<string, string>,
  token: string
): string | null => {
  'worklet';
  return Object.prototype.hasOwnProperty.call(keywords, token)
    ? keywords[token]
    : null;
};

const parseRadialPosition = (
  tokens: string[]
): RadialGradientPosition | null => {
  'worklet';
  let top: string | number | undefined;
  let left: string | number | undefined;
  let right: string | number | undefined;
  let bottom: string | number | undefined;

  if (tokens.length === 1) {
    const token = tokens[0];
    const horizontal = getKeywordPosition(HORIZONTAL_POSITION_KEYWORDS, token);
    const vertical = getKeywordPosition(VERTICAL_POSITION_KEYWORDS, token);
    if (horizontal !== null) {
      left = horizontal;
      top = '50%';
    } else if (vertical !== null) {
      left = '50%';
      top = vertical;
    } else if (isLengthOrPercentageToken(token)) {
      const value = getPositionFromCSSValue(token);
      if (value === null) {
        return null;
      }
      left = value;
      top = '50%';
    }
  } else if (tokens.length === 2) {
    const [token1, token2] = tokens;
    const horizontal1 = getKeywordPosition(
      HORIZONTAL_POSITION_KEYWORDS,
      token1
    );
    const vertical1 = getKeywordPosition(VERTICAL_POSITION_KEYWORDS, token1);
    const horizontal2 = getKeywordPosition(
      HORIZONTAL_POSITION_KEYWORDS,
      token2
    );
    const vertical2 = getKeywordPosition(VERTICAL_POSITION_KEYWORDS, token2);
    if (horizontal1 !== null && vertical2 !== null) {
      left = horizontal1;
      top = vertical2;
    } else if (vertical1 !== null && horizontal2 !== null) {
      left = horizontal2;
      top = vertical1;
    } else {
      if (horizontal1 !== null) {
        left = horizontal1;
      } else if (isLengthOrPercentageToken(token1)) {
        const value = getPositionFromCSSValue(token1);
        if (value === null) {
          return null;
        }
        left = value;
      } else {
        return null;
      }

      if (vertical2 !== null) {
        top = vertical2;
      } else if (isLengthOrPercentageToken(token2)) {
        const value = getPositionFromCSSValue(token2);
        if (value === null) {
          return null;
        }
        top = value;
      } else {
        return null;
      }
    }
  } else if (tokens.length === 4) {
    for (const [keyword, rawValue] of [
      [tokens[0], tokens[1]],
      [tokens[2], tokens[3]],
    ]) {
      const value = getPositionFromCSSValue(rawValue);
      if (value === null) {
        return null;
      }
      if (keyword === 'left') {
        left = value;
      } else if (keyword === 'right') {
        right = value;
      } else if (keyword === 'top') {
        top = value;
      } else if (keyword === 'bottom') {
        bottom = value;
      } else {
        return null;
      }
    }
  }

  if (top != null && left != null) {
    return { top, left };
  }
  if (bottom != null && right != null) {
    return { bottom, right };
  }
  if (top != null && right != null) {
    return { top, right };
  }
  if (bottom != null && left != null) {
    return { bottom, left };
  }
  return null;
};

const parseRadialGradientCSSString = (
  content: string,
  context?: ValueProcessorContext
): ProcessedBackgroundImageValue | null => {
  'worklet';
  let shape: RadialGradientShape = DEFAULT_RADIAL_SHAPE;
  let size: RadialGradientSize = DEFAULT_RADIAL_SIZE;
  let position: RadialGradientPosition = { ...DEFAULT_RADIAL_POSITION };

  const parts = splitByComma(content);
  const tokens = splitByWhitespace(parts[0]);
  let hasShapeSizeOrPosition = false;
  let hasExplicitSingleSize = false;
  let hasExplicitShape = false;

  while (tokens.length > 0) {
    const token = tokens.shift()!;

    if (token === 'circle' || token === 'ellipse') {
      shape = token;
      hasShapeSizeOrPosition = true;
      hasExplicitShape = true;
    } else if (RADIAL_SIZE_KEYWORDS.includes(token)) {
      size = token as RadialGradientSize;
      hasShapeSizeOrPosition = true;
    } else if (isLengthOrPercentageToken(token)) {
      const sizeX = getPositionFromCSSValue(token);
      if (sizeX === null || parseFloat(token) < 0) {
        return null;
      }
      hasShapeSizeOrPosition = true;
      size = { x: sizeX, y: sizeX };

      const nextToken = tokens[0];
      if (nextToken !== undefined && isLengthOrPercentageToken(nextToken)) {
        tokens.shift();
        const sizeY = getPositionFromCSSValue(nextToken);
        if (sizeY === null || parseFloat(nextToken) < 0) {
          return null;
        }
        size = { x: sizeX, y: sizeY };
      } else {
        hasExplicitSingleSize = true;
      }
    } else if (token === 'at') {
      hasShapeSizeOrPosition = true;
      const parsedPosition = parseRadialPosition(tokens.splice(0));
      if (parsedPosition === null) {
        return null;
      }
      position = parsedPosition;
    }

    if (!hasShapeSizeOrPosition) {
      break;
    }
  }

  if (hasShapeSizeOrPosition) {
    parts.shift();
    if (!hasExplicitShape && hasExplicitSingleSize) {
      shape = 'circle';
    }
    if (hasExplicitSingleSize && hasExplicitShape && shape === 'ellipse') {
      return null;
    }
  }

  const colorStops = parseColorStopsCSSString(parts, context);
  if (colorStops === null) {
    return null;
  }

  return { type: 'radial-gradient', shape, size, position, colorStops };
};

const parseBackgroundImageCSSString = (
  value: string,
  context?: ValueProcessorContext
): ProcessedBackgroundImageValue[] => {
  'worklet';
  const result: ProcessedBackgroundImageValue[] = [];

  for (const gradientString of splitByComma(
    value.replace(NEWLINE_REGEX, ' ')
  )) {
    const match = GRADIENT_REGEX.exec(gradientString.toLowerCase());
    if (!match) {
      continue;
    }
    const [, type, content] = match;
    const gradient =
      type === 'radial'
        ? parseRadialGradientCSSString(content, context)
        : parseLinearGradientCSSString(content, context);
    if (gradient !== null) {
      result.push(gradient);
    }
  }

  return result;
};

export const processBackgroundImage: ValueProcessor<
  BackgroundImageStyleValue,
  ProcessedBackgroundImageValue[] | undefined
> = (value, context) => {
  'worklet';
  if (typeof value === 'string') {
    return parseBackgroundImageCSSString(value, context);
  }
  if (!Array.isArray(value)) {
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
