'use strict';
import type { UnknownRecord } from '../../../common';
import type { CSSTransitionConfig } from '../types';

const SIDE_WIDTHS = [
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStartWidth',
  'borderEndWidth',
];

const SIDE_COLORS = [
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderStartColor',
  'borderEndColor',
  'borderBlockColor',
  'borderBlockStartColor',
  'borderBlockEndColor',
];

const CORNER_RADII = [
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderTopStartRadius',
  'borderTopEndRadius',
  'borderBottomStartRadius',
  'borderBottomEndRadius',
  'borderStartStartRadius',
  'borderStartEndRadius',
  'borderEndStartRadius',
  'borderEndEndRadius',
];

// The resolved value when every side or corner agrees with the shorthand;
// undefined when one differs. A side set on its own differs from the unset rest.
function uniformValue(
  style: UnknownRecord,
  shorthand: string,
  longhands: string[],
  fallback: unknown
): unknown {
  const base = style[shorthand] ?? fallback;
  for (const key of longhands) {
    if (key in style && style[key] !== undefined && style[key] !== base) {
      return undefined;
    }
  }
  return base;
}

function isTransparent(color: unknown): boolean {
  // Processed colors are ARGB numbers; anything else (a PlatformColor) may be opaque.
  return typeof color === 'number' && color >>> 24 === 0;
}

/**
 * Mirrors React Native's useCoreAnimationBorderRendering
 * (RCTViewComponentView): background, border and corner radius are drawn on the
 * view's own layer, where Core Animation transitions run, only when the border
 * is uniform and solid, the radius is one circular value, and either the border
 * is invisible or the view clips. Otherwise React Native paints them into
 * sublayers the transition never reaches, so those properties have to run on
 * the animation loop.
 */
export function supportsPlatformRouting(style: UnknownRecord): boolean {
  const width = uniformValue(style, 'borderWidth', SIDE_WIDTHS, 0);
  const color = uniformValue(style, 'borderColor', SIDE_COLORS, undefined);
  const radius = uniformValue(style, 'borderRadius', CORNER_RADII, 0);
  const borderStyle = style.borderStyle ?? 'solid';
  const clips = style.overflow === 'hidden' || style.overflow === 'scroll';

  return (
    typeof width === 'number' &&
    // A sole longhand color differs from the unset shorthand.
    (color !== undefined || !SIDE_COLORS.some((key) => key in style)) &&
    typeof radius === 'number' &&
    borderStyle === 'solid' &&
    (width === 0 || clips || isTransparent(color))
  );
}

/**
 * A border or overflow transition runs on the loop and changes what React
 * Native draws on the view's own layer until it ends, whatever the committed
 * styles say, so the platform stays off until then.
 */
export function platformBlockedUntil(
  config: CSSTransitionConfig,
  now: number
): number {
  let until = 0;
  for (const [property, settings] of Object.entries(config)) {
    if (
      settings &&
      (property === 'overflow' || property.startsWith('border'))
    ) {
      until = Math.max(until, now + settings.delay + settings.duration);
    }
  }
  return until;
}
