'use strict';
import type { ColorValue } from 'react-native';

import { isPercentage, maybeAddSuffix } from '../../../utils';
import type { ValueProcessor } from '../types';
import { processColor } from './colors';

// Declared locally because the stable `backgroundImage` style prop and its
// types exist only since React Native 0.87.
type GradientColorStop = {
  color: ColorValue | number | null;
  positions?: ReadonlyArray<string | number>;
};

type LinearGradientValue = {
  type: 'linear-gradient';
  direction?: string;
  colorStops: ReadonlyArray<GradientColorStop>;
};

type RadialGradientLengthSize = { x: string | number; y: string | number };

type RadialGradientPosition = {
  top?: number | string;
  left?: number | string;
  bottom?: number | string;
  right?: number | string;
};

type RadialGradientValue = {
  type: 'radial-gradient';
  shape?: 'circle' | 'ellipse';
  size?:
    | 'closest-corner'
    | 'closest-side'
    | 'farthest-corner'
    | 'farthest-side'
    | RadialGradientLengthSize;
  position?: RadialGradientPosition;
  colorStops: ReadonlyArray<GradientColorStop>;
};

type BackgroundImageValue = LinearGradientValue | RadialGradientValue;

function isTransitionHint({ color }: GradientColorStop): boolean {
  return color == null;
}

function serializeColorStop({
  color,
  positions,
}: GradientColorStop): string | undefined {
  const serializedPositions =
    positions?.map((position) => maybeAddSuffix(position, 'px')).join(' ') ??
    '';
  if (color == null) {
    // Transition hint (e.g. red, 20%, blue)
    return positions?.length === 1 ? serializedPositions : undefined;
  }

  const serializedColor = processColor(color as ColorValue);
  if (typeof serializedColor !== 'string') {
    return;
  }
  return serializedPositions
    ? `${serializedColor} ${serializedPositions}`
    : serializedColor;
}

function serializeColorStops(
  colorStops: ReadonlyArray<GradientColorStop>
): string | undefined {
  const serialized: string[] = [];
  for (let i = 0; i < colorStops.length; i++) {
    const colorStop = colorStops[i];
    // A hint is only valid between two color stops.
    if (
      isTransitionHint(colorStop) &&
      (i === 0 ||
        i === colorStops.length - 1 ||
        isTransitionHint(colorStops[i - 1]))
    ) {
      return;
    }
    const serializedColorStop = serializeColorStop(colorStop);
    if (serializedColorStop === undefined) {
      return;
    }
    serialized.push(serializedColorStop);
  }
  return serialized.join(', ');
}

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

// CSS allows only one non-negative <length> as an explicit circle radius, while
// React Native draws max(x, y). A percentage radius has no CSS spelling at all,
// so it degrades to the equivalent ellipse rather than making the browser drop
// the whole declaration.
function serializeRadialGradientLengthSize(
  shape: RadialGradientValue['shape'],
  { x, y }: RadialGradientLengthSize
): string {
  const radii = `${maybeAddSuffix(x, 'px')} ${maybeAddSuffix(y, 'px')}`;

  if (shape !== 'circle') {
    return shape ? `${shape} ${radii}` : radii;
  }
  if (isPercentage(x) || isPercentage(y)) {
    return radii;
  }
  const radius = Math.max(parseFloat(String(x)), parseFloat(String(y)));
  return `circle ${maybeAddSuffix(radius, 'px')}`;
}

function serializeRadialGradientPrelude({
  shape,
  size,
  position,
}: RadialGradientValue): string {
  const parts: string[] = [];

  if (typeof size === 'object') {
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
  string | ReadonlyArray<BackgroundImageValue>
> = (value) => {
  if (typeof value === 'string') {
    return value;
  }

  const gradients: string[] = [];
  for (const gradient of value) {
    const colorStops = serializeColorStops(gradient.colorStops);
    if (colorStops === undefined) {
      return;
    }
    const prelude =
      gradient.type === 'linear-gradient'
        ? gradient.direction
        : serializeRadialGradientPrelude(gradient);
    gradients.push(
      `${gradient.type}(${prelude ? `${prelude}, ` : ''}${colorStops})`
    );
  }
  return gradients.join(', ');
};
