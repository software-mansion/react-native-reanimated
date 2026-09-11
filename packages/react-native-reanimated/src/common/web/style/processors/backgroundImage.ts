'use strict';
import type { ColorValue } from 'react-native';

import type { ValueProcessor } from '../../../types';
import { maybeAddSuffix } from '../../../utils';
import { processColor } from './colors';

// Types are defined locally instead of being imported from `react-native`
// because the stable `backgroundImage` style prop (and its types) is
// available only since react-native 0.87.
type GradientColorStop = {
  color: ColorValue | number | null;
  positions?: ReadonlyArray<string>;
};

type LinearGradientValue = {
  type: 'linear-gradient';
  direction?: string;
  colorStops: ReadonlyArray<GradientColorStop>;
};

type RadialGradientValue = {
  type: 'radial-gradient';
  shape?: 'circle' | 'ellipse';
  size?:
    | 'closest-corner'
    | 'closest-side'
    | 'farthest-corner'
    | 'farthest-side'
    | { x: string | number; y: string | number };
  position?: {
    top?: number | string;
    left?: number | string;
    bottom?: number | string;
    right?: number | string;
  };
  colorStops: ReadonlyArray<GradientColorStop>;
};

type BackgroundImageValue = LinearGradientValue | RadialGradientValue;

function serializeColorStops(
  colorStops: ReadonlyArray<GradientColorStop>
): string {
  return colorStops
    .map(({ color, positions }) => {
      const positionsString = positions?.join(' ') ?? '';
      if (color == null) {
        // Transition hint syntax (e.g. red, 20%, blue)
        return positionsString;
      }
      const processedColor = processColor(color as ColorValue);
      const colorString =
        typeof processedColor === 'string' ? processedColor : String(color);
      return [colorString, positionsString].filter(Boolean).join(' ');
    })
    .join(', ');
}

function serializeRadialGradientPrelude({
  shape,
  size,
  position,
}: RadialGradientValue): string {
  const parts: string[] = [];

  if (shape) {
    parts.push(shape);
  }
  if (size) {
    if (typeof size === 'string') {
      parts.push(size);
    } else if (shape === 'circle') {
      // The CSS grammar allows only a single non-negative <length> as an
      // explicit circle radius - two values describe an ellipse and a
      // percentage radius is invalid, so browsers would reject the whole
      // declaration.
      const isPercent = typeof size.x === 'string' && size.x.endsWith('%');
      if (size.x !== size.y || isPercent) {
        throw new Error(
          `[Reanimated] Invalid circle size ${JSON.stringify(size)} in a radial gradient. A circle radius must be a single length (e.g. 100 or "100px").`
        );
      }
      parts.push(maybeAddSuffix(size.x, 'px'));
    } else {
      parts.push(
        `${maybeAddSuffix(size.x, 'px')} ${maybeAddSuffix(size.y, 'px')}`
      );
    }
  }
  if (position) {
    const positionParts = Object.entries(position).map(
      ([side, value]) => `${side} ${maybeAddSuffix(value, 'px')}`
    );
    if (positionParts.length > 0) {
      parts.push(`at ${positionParts.join(' ')}`);
    }
  }

  return parts.join(' ');
}

export const processBackgroundImageWeb: ValueProcessor<
  string | ReadonlyArray<BackgroundImageValue>,
  string
> = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  return value
    .map((gradient) => {
      const colorStops = serializeColorStops(gradient.colorStops);

      if (gradient.type === 'linear-gradient') {
        const prelude = gradient.direction ? `${gradient.direction}, ` : '';
        return `linear-gradient(${prelude}${colorStops})`;
      }

      const prelude = serializeRadialGradientPrelude(gradient);
      return `radial-gradient(${prelude ? `${prelude}, ` : ''}${colorStops})`;
    })
    .join(', ');
};
