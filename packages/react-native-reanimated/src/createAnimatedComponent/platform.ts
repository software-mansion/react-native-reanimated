'use strict';

/**
 * Web resolves pseudo selectors with plain CSS, so no element has to become a
 * touch target for them.
 */
export const svgHitTestResponder: (() => boolean) | undefined = undefined;
