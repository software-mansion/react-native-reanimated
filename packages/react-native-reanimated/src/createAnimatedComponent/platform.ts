'use strict';

/**
 * Web resolves pseudo selectors with plain CSS, so no element has to become a
 * touch target for them.
 */
export const svgHitTestResponder: (() => boolean) | undefined = undefined;

/**
 * Web applies CSS animations to the SVG element itself, so no prop has to be
 * forwarded for its children to inherit the animated value.
 */
export const svgInheritedPropDefaults: Record<string, unknown> | undefined =
  undefined;
