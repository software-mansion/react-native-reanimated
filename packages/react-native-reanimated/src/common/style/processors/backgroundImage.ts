'use strict';
import type { ColorValue } from 'react-native';

import type { ValueProcessor, ValueProcessorContext } from '../../types';
import { processColor, type ProcessedColor } from './colors';

// Types are defined locally instead of being imported from `react-native`
// because the stable `backgroundImage` style prop (and its types) is
// available only since react-native 0.87.
type GradientColorStop = {
  color: ColorValue | number | null;
  positions?: ReadonlyArray<string>;
};

type LinearGradientValue = {
  type: 'linear-gradient';
  // Angle or direction enums
  direction?: string;
  colorStops: ReadonlyArray<GradientColorStop>;
};

type RadialGradientShape = 'circle' | 'ellipse';

type RadialGradientSize =
  | 'closest-corner'
  | 'closest-side'
  | 'farthest-corner'
  | 'farthest-side'
  | {
      x: string | number;
      y: string | number;
    };

type RadialGradientPosition = {
  top?: number | string;
  left?: number | string;
  bottom?: number | string;
  right?: number | string;
};

type RadialGradientValue = {
  type: 'radial-gradient';
  shape?: RadialGradientShape;
  size?: RadialGradientSize;
  position?: RadialGradientPosition;
  colorStops: ReadonlyArray<GradientColorStop>;
};

export type BackgroundImageValue = LinearGradientValue | RadialGradientValue;

// null color indicates that the transition hint syntax is used (e.g. red, 20%, blue)
type ProcessedColorStopColor = ProcessedColor | null;
// number - pixel value, string - percentage, null - position not specified
type ProcessedColorStopPosition = number | string | null;

type ProcessedGradientColorStop = {
  color: ProcessedColorStopColor;
  position: ProcessedColorStopPosition;
};

type ProcessedLinearGradientDirection =
  | { type: 'angle'; value: number }
  | { type: 'keyword'; value: string };

type ProcessedLinearGradient = {
  type: 'linear-gradient';
  direction: ProcessedLinearGradientDirection;
  colorStops: ProcessedGradientColorStop[];
};

type ProcessedRadialGradient = {
  type: 'radial-gradient';
  shape: RadialGradientShape;
  size: RadialGradientSize;
  position: RadialGradientPosition;
  colorStops: ProcessedGradientColorStop[];
};

type ProcessedBackgroundImage = Array<
  ProcessedLinearGradient | ProcessedRadialGradient
>;

const NEWLINE_REGEX = /\n/g;
const GRADIENT_REGEX = /^(linear|radial)-gradient\(((?:\([^)]*\)|[^()])*)\)/;
const COMMA_SPLIT_REGEX = /,(?![^(]*\))/;
const WHITESPACE_SPLIT_REGEX = /\s+/;
const COLOR_STOP_PARTS_REGEX = /\S+\([^)]*\)|\S+/g;
const WHITESPACE_NORMALIZE_REGEX = /\s+/g;

const LINEAR_GRADIENT_ANGLE_UNIT_REGEX =
  /^([+-]?\d*\.?\d+)(deg|grad|rad|turn)$/;

const DEFAULT_LINEAR_GRADIENT_DIRECTION: ProcessedLinearGradientDirection = {
  type: 'angle',
  value: 180,
};
const DEFAULT_RADIAL_SHAPE = 'ellipse';
const DEFAULT_RADIAL_SIZE = 'farthest-corner';

function getAngleInDegrees(angle: string): number | null {
  'worklet';
  const match = angle.match(LINEAR_GRADIENT_ANGLE_UNIT_REGEX);
  if (!match) {
    return null;
  }

  const [, value, unit] = match;
  const numericValue = parseFloat(value);

  switch (unit) {
    case 'deg':
      return numericValue;
    case 'grad':
      return numericValue * 0.9; // 1 grad = 0.9 degrees
    case 'rad':
      return (numericValue * 180) / Math.PI;
    case 'turn':
      return numericValue * 360; // 1 turn = 360 degrees
    default:
      return null;
  }
}

function getDirectionForKeyword(
  direction: string
): ProcessedLinearGradientDirection | null {
  'worklet';
  const normalized = direction.replace(WHITESPACE_NORMALIZE_REGEX, ' ');

  switch (normalized) {
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
}

function getPositionFromCSSValue(position: string): number | string | null {
  'worklet';
  if (position.endsWith('px')) {
    return parseFloat(position);
  }
  if (position.endsWith('%')) {
    return position;
  }
  return null;
}

const ERROR_MESSAGES = {
  invalidBackgroundImage(value: unknown) {
    'worklet';
    return `Background image value must be a string or an array of gradient objects (e.g. [{ type: 'linear-gradient', direction, colorStops }]). Received: ${JSON.stringify(value)}.`;
  },
  invalidDirection(direction: string) {
    'worklet';
    return `Invalid direction "${direction}" in a linear gradient. Expected an angle (e.g. "45deg") or a direction keyword (e.g. "to bottom right").`;
  },
  invalidGradientShape(shape: string) {
    'worklet';
    return `Invalid shape "${shape}" in a radial gradient. Expected "circle" or "ellipse".`;
  },
  invalidGradientSize(size: unknown) {
    'worklet';
    return `Invalid size ${JSON.stringify(size)} in a radial gradient. Expected an extent keyword (e.g. "farthest-corner"), a single non-negative length, or a pair of non-negative lengths.`;
  },
  invalidGradientPosition(position: unknown) {
    'worklet';
    return `Invalid position ${JSON.stringify(position)} in a radial gradient.`;
  },
  invalidColorStopPosition(position: unknown) {
    'worklet';
    return `Invalid color stop position ${JSON.stringify(position)} in a gradient. Expected a number (pixels) or a percentage string.`;
  },
  invalidTransitionHint(hint: unknown) {
    'worklet';
    return `Invalid transition hint ${JSON.stringify(hint)} in a gradient. A transition hint must be a single position placed between two color stops.`;
  },
  invalidColorStop(colorStop: unknown) {
    'worklet';
    return `Invalid color stop ${JSON.stringify(colorStop)} in a gradient.`;
  },
  invalidGradientString(gradient: string) {
    'worklet';
    return `Invalid gradient "${gradient}". Expected a comma-separated list of linear-gradient(...) or radial-gradient(...) functions.`;
  },
};

function processColorStops(
  colorStops: ReadonlyArray<GradientColorStop>,
  context?: ValueProcessorContext
): ProcessedGradientColorStop[] {
  'worklet';
  const processedColorStops: ProcessedGradientColorStop[] = [];

  for (const colorStop of colorStops) {
    const positions = colorStop.positions;
    // Color transition hint syntax (red, 20%, blue)
    if (
      colorStop.color == null &&
      Array.isArray(positions) &&
      positions.length === 1
    ) {
      const position = positions[0];
      if (
        typeof position === 'number' ||
        (typeof position === 'string' && position.endsWith('%'))
      ) {
        processedColorStops.push({ color: null, position });
      } else {
        throw new Error(
          `[Reanimated] ${ERROR_MESSAGES.invalidTransitionHint(position)}`
        );
      }
    } else {
      const processedColor = processColor(colorStop.color, context);
      if (processedColor == null) {
        throw new Error(
          `[Reanimated] ${ERROR_MESSAGES.invalidColorStop(colorStop)}`
        );
      }
      if (positions && positions.length > 0) {
        for (const position of positions) {
          if (
            typeof position === 'number' ||
            (typeof position === 'string' && position.endsWith('%'))
          ) {
            processedColorStops.push({ color: processedColor, position });
          } else {
            throw new Error(
              `[Reanimated] ${ERROR_MESSAGES.invalidColorStopPosition(position)}`
            );
          }
        }
      } else {
        processedColorStops.push({ color: processedColor, position: null });
      }
    }
  }

  return processedColorStops;
}

function parseColorStopsCSSString(
  parts: string[],
  context?: ValueProcessorContext
): ProcessedGradientColorStop[] {
  'worklet';
  const colorStopsString = parts.join(',');
  const colorStops: ProcessedGradientColorStop[] = [];
  // split by comma, but not if it's inside parentheses
  // e.g. red, rgba(0, 0, 0, 0.5), green => ["red", "rgba(0, 0, 0, 0.5)", "green"]
  const stops = colorStopsString.split(COMMA_SPLIT_REGEX);
  let prevStop: RegExpMatchArray | null = null;

  for (let i = 0; i < stops.length; i++) {
    const trimmedStop = stops[i].trim();
    // Match function like pattern or single words
    const colorStopParts = trimmedStop.match(COLOR_STOP_PARTS_REGEX);
    if (colorStopParts == null) {
      throw new Error(
        `[Reanimated] ${ERROR_MESSAGES.invalidColorStop(trimmedStop)}`
      );
    }
    // Case 1: [color, position, position]
    if (colorStopParts.length === 3) {
      const position1 = getPositionFromCSSValue(colorStopParts[1]);
      const position2 = getPositionFromCSSValue(colorStopParts[2]);
      if (position1 == null || position2 == null) {
        throw new Error(
          `[Reanimated] ${ERROR_MESSAGES.invalidColorStopPosition(trimmedStop)}`
        );
      }
      const processedColor = processColor(colorStopParts[0], context);
      colorStops.push({ color: processedColor, position: position1 });
      colorStops.push({ color: processedColor, position: position2 });
    }
    // Case 2: [color, position]
    else if (colorStopParts.length === 2) {
      const position = getPositionFromCSSValue(colorStopParts[1]);
      if (position == null) {
        throw new Error(
          `[Reanimated] ${ERROR_MESSAGES.invalidColorStopPosition(trimmedStop)}`
        );
      }
      const processedColor = processColor(colorStopParts[0], context);
      colorStops.push({ color: processedColor, position });
    }
    // Case 3: [color]
    // Case 4: [position] => transition hint syntax
    else if (colorStopParts.length === 1) {
      const position = getPositionFromCSSValue(colorStopParts[0]);
      if (position != null) {
        // A transition hint must have a color stop before and after it
        // (e.g. red, 20%, blue)
        if (
          (prevStop != null &&
            prevStop.length === 1 &&
            getPositionFromCSSValue(prevStop[0]) != null) ||
          i === stops.length - 1 ||
          i === 0
        ) {
          throw new Error(
            `[Reanimated] ${ERROR_MESSAGES.invalidTransitionHint(trimmedStop)}`
          );
        }
        colorStops.push({ color: null, position });
      } else {
        colorStops.push({
          color: processColor(colorStopParts[0], context),
          position: null,
        });
      }
    } else {
      throw new Error(
        `[Reanimated] ${ERROR_MESSAGES.invalidColorStop(trimmedStop)}`
      );
    }
    prevStop = colorStopParts;
  }

  return colorStops;
}

function parseLinearGradientCSSString(
  gradientContent: string,
  context?: ValueProcessorContext
): ProcessedLinearGradient {
  'worklet';
  const parts = gradientContent.split(',');
  let direction: ProcessedLinearGradientDirection =
    DEFAULT_LINEAR_GRADIENT_DIRECTION;
  const trimmedDirection = parts[0].trim();

  if (LINEAR_GRADIENT_ANGLE_UNIT_REGEX.test(trimmedDirection)) {
    const parsedAngle = getAngleInDegrees(trimmedDirection);
    if (parsedAngle == null) {
      throw new Error(
        `[Reanimated] ${ERROR_MESSAGES.invalidDirection(trimmedDirection)}`
      );
    }
    direction = { type: 'angle', value: parsedAngle };
    parts.shift();
  } else if (trimmedDirection.startsWith('to ')) {
    const parsedDirection = getDirectionForKeyword(trimmedDirection);
    if (parsedDirection == null) {
      throw new Error(
        `[Reanimated] ${ERROR_MESSAGES.invalidDirection(trimmedDirection)}`
      );
    }
    direction = parsedDirection;
    parts.shift();
  }

  return {
    type: 'linear-gradient',
    direction,
    colorStops: parseColorStopsCSSString(parts, context),
  };
}

function parseRadialGradientCSSString(
  gradientContent: string,
  context?: ValueProcessorContext
): ProcessedRadialGradient {
  'worklet';
  let shape: RadialGradientShape = DEFAULT_RADIAL_SHAPE;
  let size: RadialGradientSize = DEFAULT_RADIAL_SIZE;
  let position: RadialGradientPosition = { top: '50%', left: '50%' };

  // split the content by commas, but not if inside parentheses (for color values)
  const parts = gradientContent.split(COMMA_SPLIT_REGEX);
  // first part may contain shape, size, and position
  // [ <radial-shape> || <radial-size> ]? [ at <position> ]?
  const firstPartStr = parts[0].trim();
  const remainingParts = [...parts];
  let hasShapeSizeOrPositionString = false;
  let hasExplicitSingleSize = false;
  let hasExplicitShape = false;
  const firstPartTokens = firstPartStr.split(WHITESPACE_SPLIT_REGEX);

  const invalidGradient = () => {
    'worklet';
    return new Error(
      `[Reanimated] ${ERROR_MESSAGES.invalidGradientString(`radial-gradient(${gradientContent})`)}`
    );
  };

  while (firstPartTokens.length > 0) {
    let token = firstPartTokens.shift();
    if (token == null) {
      continue;
    }
    let tokenTrimmed = token.trim();

    if (tokenTrimmed === 'circle' || tokenTrimmed === 'ellipse') {
      shape = tokenTrimmed;
      hasShapeSizeOrPositionString = true;
      hasExplicitShape = true;
    } else if (
      tokenTrimmed === 'closest-corner' ||
      tokenTrimmed === 'farthest-corner' ||
      tokenTrimmed === 'closest-side' ||
      tokenTrimmed === 'farthest-side'
    ) {
      size = tokenTrimmed;
      hasShapeSizeOrPositionString = true;
    } else if (tokenTrimmed.endsWith('px') || tokenTrimmed.endsWith('%')) {
      const sizeX = getPositionFromCSSValue(tokenTrimmed);
      if (sizeX == null || (typeof sizeX === 'number' && sizeX < 0)) {
        throw invalidGradient();
      }
      hasShapeSizeOrPositionString = true;
      size = { x: sizeX, y: sizeX };
      token = firstPartTokens.shift();
      if (token == null) {
        hasExplicitSingleSize = true;
        continue;
      }
      tokenTrimmed = token.trim();
      if (tokenTrimmed.endsWith('px') || tokenTrimmed.endsWith('%')) {
        const sizeY = getPositionFromCSSValue(tokenTrimmed);
        if (sizeY == null || (typeof sizeY === 'number' && sizeY < 0)) {
          throw invalidGradient();
        }
        size = { x: sizeX, y: sizeY };
      } else {
        hasExplicitSingleSize = true;
        // The token after the size is not a second size value (e.g. 'at' or a
        // shape keyword). Put it back so the loop can process it, otherwise
        // the position would be silently dropped and its values re-parsed as
        // a new size.
        firstPartTokens.unshift(token);
      }
    } else if (tokenTrimmed === 'at') {
      let top: string | number | undefined;
      let left: string | number | undefined;
      let right: string | number | undefined;
      let bottom: string | number | undefined;
      hasShapeSizeOrPositionString = true;

      if (firstPartTokens.length === 0) {
        // 'at' must be followed by a position
        throw invalidGradient();
      }

      // 1. [ left | center | right | top | bottom | <length-percentage> ]
      if (firstPartTokens.length === 1) {
        token = firstPartTokens.shift();
        if (token == null) {
          throw invalidGradient();
        }
        tokenTrimmed = token.trim();
        if (tokenTrimmed === 'left') {
          left = '0%';
          top = '50%';
        } else if (tokenTrimmed === 'center') {
          left = '50%';
          top = '50%';
        } else if (tokenTrimmed === 'right') {
          left = '100%';
          top = '50%';
        } else if (tokenTrimmed === 'top') {
          left = '50%';
          top = '0%';
        } else if (tokenTrimmed === 'bottom') {
          left = '50%';
          top = '100%';
        } else if (tokenTrimmed.endsWith('px') || tokenTrimmed.endsWith('%')) {
          const value = getPositionFromCSSValue(tokenTrimmed);
          if (value == null) {
            throw invalidGradient();
          }
          left = value;
          top = '50%';
        }
      }

      if (firstPartTokens.length === 2) {
        const t1 = firstPartTokens.shift();
        const t2 = firstPartTokens.shift();
        if (t1 == null || t2 == null) {
          throw invalidGradient();
        }

        const token1 = t1.trim();
        const token2 = t2.trim();

        // 2. [ left | center | right ] && [ top | center | bottom ]
        const horizontalPositions = ['left', 'center', 'right'];
        const verticalPositions = ['top', 'center', 'bottom'];

        if (
          horizontalPositions.includes(token1) &&
          verticalPositions.includes(token2)
        ) {
          left =
            token1 === 'left' ? '0%' : token1 === 'center' ? '50%' : '100%';
          top = token2 === 'top' ? '0%' : token2 === 'center' ? '50%' : '100%';
        } else if (
          verticalPositions.includes(token1) &&
          horizontalPositions.includes(token2)
        ) {
          left =
            token2 === 'left' ? '0%' : token2 === 'center' ? '50%' : '100%';
          top = token1 === 'top' ? '0%' : token1 === 'center' ? '50%' : '100%';
        }
        // 3. [ left | center | right | <length-percentage> ] [ top | center | bottom | <length-percentage> ]
        else {
          if (token1 === 'left') {
            left = '0%';
          } else if (token1 === 'center') {
            left = '50%';
          } else if (token1 === 'right') {
            left = '100%';
          } else if (token1.endsWith('px') || token1.endsWith('%')) {
            const value = getPositionFromCSSValue(token1);
            if (value == null) {
              throw invalidGradient();
            }
            left = value;
          } else {
            throw invalidGradient();
          }

          if (token2 === 'top') {
            top = '0%';
          } else if (token2 === 'center') {
            top = '50%';
          } else if (token2 === 'bottom') {
            top = '100%';
          } else if (token2.endsWith('px') || token2.endsWith('%')) {
            const value = getPositionFromCSSValue(token2);
            if (value == null) {
              throw invalidGradient();
            }
            top = value;
          } else {
            throw invalidGradient();
          }
        }
      }

      // 4. [ [ left | right ] <length-percentage> ] && [ [ top | bottom ] <length-percentage> ]
      if (firstPartTokens.length === 4) {
        const t1 = firstPartTokens.shift();
        const t2 = firstPartTokens.shift();
        const t3 = firstPartTokens.shift();
        const t4 = firstPartTokens.shift();

        if (t1 == null || t2 == null || t3 == null || t4 == null) {
          throw invalidGradient();
        }
        const keyword1 = t1.trim();
        const value1 = getPositionFromCSSValue(t2.trim());
        const keyword2 = t3.trim();
        const value2 = getPositionFromCSSValue(t4.trim());
        if (value1 == null || value2 == null) {
          throw invalidGradient();
        }

        if (keyword1 === 'left') {
          left = value1;
        } else if (keyword1 === 'right') {
          right = value1;
        } else if (keyword1 === 'top') {
          top = value1;
        } else if (keyword1 === 'bottom') {
          bottom = value1;
        } else {
          throw invalidGradient();
        }

        if (keyword2 === 'left') {
          left = value2;
        } else if (keyword2 === 'right') {
          right = value2;
        } else if (keyword2 === 'top') {
          top = value2;
        } else if (keyword2 === 'bottom') {
          bottom = value2;
        } else {
          throw invalidGradient();
        }
      }

      if (top != null && left != null) {
        position = { top, left };
      } else if (bottom != null && right != null) {
        position = { bottom, right };
      } else if (top != null && right != null) {
        position = { top, right };
      } else if (bottom != null && left != null) {
        position = { bottom, left };
      } else {
        throw invalidGradient();
      }
      // 'at' comes at the end of the first part of the radial gradient syntax
      break;
    }

    // if there is no shape, size, or position string found in the first
    // token, break as it might be a color stop
    if (!hasShapeSizeOrPositionString) {
      break;
    }
  }

  if (hasShapeSizeOrPositionString) {
    remainingParts.shift();

    if (!hasExplicitShape && hasExplicitSingleSize) {
      shape = 'circle';
    }

    if (hasExplicitSingleSize && hasExplicitShape && shape === 'ellipse') {
      // A single size can be used only with the circle shape
      throw invalidGradient();
    }

    if (
      shape === 'circle' &&
      typeof size === 'object' &&
      (typeof size.x === 'string' || typeof size.y === 'string')
    ) {
      // A circle radius must be a <length>. Percentages are only valid for
      // ellipses, so browsers reject the whole declaration.
      throw new Error(
        `[Reanimated] ${ERROR_MESSAGES.invalidGradientSize(size)}`
      );
    }
  }

  return {
    type: 'radial-gradient',
    shape,
    size,
    position,
    colorStops: parseColorStopsCSSString(remainingParts, context),
  };
}

function splitGradients(input: string): string[] {
  'worklet';
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    } else if (char === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim() !== '') {
    result.push(current.trim());
  }

  return result;
}

function parseBackgroundImageCSSString(
  cssString: string,
  context?: ValueProcessorContext
): ProcessedBackgroundImage {
  'worklet';
  const gradients: ProcessedBackgroundImage = [];
  const bgImageStrings = splitGradients(cssString);

  for (const bgImageString of bgImageStrings) {
    const bgImage = bgImageString.toLowerCase();
    const match = GRADIENT_REGEX.exec(bgImage);
    if (!match || match[0].length !== bgImage.length) {
      throw new Error(
        `[Reanimated] ${ERROR_MESSAGES.invalidGradientString(bgImageString)}`
      );
    }
    const [, type, gradientContent] = match;
    gradients.push(
      type === 'radial'
        ? parseRadialGradientCSSString(gradientContent, context)
        : parseLinearGradientCSSString(gradientContent, context)
    );
  }
  return gradients;
}

function processBackgroundImageObjects(
  backgroundImage: ReadonlyArray<BackgroundImageValue>,
  context?: ValueProcessorContext
): ProcessedBackgroundImage {
  'worklet';
  const result: ProcessedBackgroundImage = [];

  for (const bgImage of backgroundImage) {
    const processedColorStops = processColorStops(bgImage.colorStops, context);

    if (bgImage.type === 'linear-gradient') {
      let direction: ProcessedLinearGradientDirection =
        DEFAULT_LINEAR_GRADIENT_DIRECTION;
      const bgDirection =
        bgImage.direction != null ? bgImage.direction.toLowerCase() : null;

      if (bgDirection != null) {
        if (LINEAR_GRADIENT_ANGLE_UNIT_REGEX.test(bgDirection)) {
          const parsedAngle = getAngleInDegrees(bgDirection);
          if (parsedAngle == null) {
            throw new Error(
              `[Reanimated] ${ERROR_MESSAGES.invalidDirection(bgDirection)}`
            );
          }
          direction = { type: 'angle', value: parsedAngle };
        } else {
          const parsedDirection = getDirectionForKeyword(bgDirection);
          if (parsedDirection == null) {
            throw new Error(
              `[Reanimated] ${ERROR_MESSAGES.invalidDirection(bgDirection)}`
            );
          }
          direction = parsedDirection;
        }
      }

      result.push({
        type: 'linear-gradient',
        direction,
        colorStops: processedColorStops,
      });
    } else if (bgImage.type === 'radial-gradient') {
      let shape: RadialGradientShape = DEFAULT_RADIAL_SHAPE;
      let size: RadialGradientSize = DEFAULT_RADIAL_SIZE;
      let position: RadialGradientPosition = { top: '50%', left: '50%' };

      if (bgImage.shape != null) {
        if (bgImage.shape === 'circle' || bgImage.shape === 'ellipse') {
          shape = bgImage.shape;
        } else {
          throw new Error(
            `[Reanimated] ${ERROR_MESSAGES.invalidGradientShape(bgImage.shape)}`
          );
        }
      }

      if (bgImage.size != null) {
        if (
          bgImage.size === 'closest-side' ||
          bgImage.size === 'closest-corner' ||
          bgImage.size === 'farthest-side' ||
          bgImage.size === 'farthest-corner'
        ) {
          size = bgImage.size;
        } else if (
          typeof bgImage.size === 'object' &&
          bgImage.size.x != null &&
          bgImage.size.y != null
        ) {
          size = { x: bgImage.size.x, y: bgImage.size.y };
        } else {
          throw new Error(
            `[Reanimated] ${ERROR_MESSAGES.invalidGradientSize(bgImage.size)}`
          );
        }
      }

      if (bgImage.position != null) {
        position = bgImage.position;
      }

      result.push({
        type: 'radial-gradient',
        shape,
        size,
        position,
        colorStops: processedColorStops,
      });
    } else {
      throw new Error(
        `[Reanimated] ${ERROR_MESSAGES.invalidBackgroundImage(bgImage)}`
      );
    }
  }

  return result;
}

export const processBackgroundImage: ValueProcessor<
  ReadonlyArray<BackgroundImageValue> | string,
  ProcessedBackgroundImage | undefined
> = (value, context) => {
  'worklet';
  if (value === 'none') {
    return [];
  }
  if (typeof value === 'string') {
    return parseBackgroundImageCSSString(
      value.replace(NEWLINE_REGEX, ' '),
      context
    );
  }
  if (Array.isArray(value)) {
    return processBackgroundImageObjects(value, context);
  }

  throw new Error(
    `[Reanimated] ${ERROR_MESSAGES.invalidBackgroundImage(value)}`
  );
};
