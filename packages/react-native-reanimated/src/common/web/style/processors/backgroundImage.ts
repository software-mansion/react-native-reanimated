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

type RadialGradientPosition = NonNullable<RadialGradientValue['position']>;

// A one-axis clause means something else in CSS: `at top 10%` is invalid and
// `at left 10%` reads as x=0%, y=10% rather than the x=10%, y=50% native
// resolves it to. Both axes are spelled out so the two agree.
function serializeRadialGradientPosition({
  top,
  left,
  bottom,
  right,
}: RadialGradientPosition): string {
  if (top == null && left == null && bottom == null && right == null) {
    return '';
  }

  const horizontal =
    right != null && left == null
      ? `right ${maybeAddSuffix(right, 'px')}`
      : `left ${maybeAddSuffix(left ?? '50%', 'px')}`;
  const vertical =
    bottom != null && top == null
      ? `bottom ${maybeAddSuffix(bottom, 'px')}`
      : `top ${maybeAddSuffix(top ?? '50%', 'px')}`;

  return `at ${horizontal} ${vertical}`;
}

function isPercentage(value: string | number): boolean {
  return typeof value === 'string' && value.endsWith('%');
}

// CSS allows only one non-negative <length> as an explicit circle radius, while
// React Native draws max(x, y). A percentage radius has no CSS spelling at all,
// so it degrades to the equivalent ellipse rather than making the browser drop
// the whole declaration.
function serializeRadialGradientLengthSize(
  shape: RadialGradientValue['shape'],
  size: Exclude<NonNullable<RadialGradientValue['size']>, string>
): string {
  const radii = `${maybeAddSuffix(size.x, 'px')} ${maybeAddSuffix(size.y, 'px')}`;

  if (shape !== 'circle') {
    return shape ? `${shape} ${radii}` : radii;
  }
  if (isPercentage(size.x) || isPercentage(size.y)) {
    return radii;
  }
  const radius = Math.max(
    parseFloat(String(size.x)),
    parseFloat(String(size.y))
  );
  return `circle ${maybeAddSuffix(radius, 'px')}`;
}

function serializeRadialGradientPrelude({
  shape,
  size,
  position,
}: RadialGradientValue): string {
  const parts: string[] = [];

  if (size != null && typeof size === 'object') {
    parts.push(serializeRadialGradientLengthSize(shape, size));
  } else {
    if (shape) {
      parts.push(shape);
    }
    if (size) {
      parts.push(size);
    }
  }
  if (position) {
    const serializedPosition = serializeRadialGradientPosition(position);
    if (serializedPosition) {
      parts.push(serializedPosition);
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
