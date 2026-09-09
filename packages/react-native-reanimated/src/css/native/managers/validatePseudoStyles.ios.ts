'use strict';
import type { UnknownRecord } from '../../../common';
import { logger } from '../../../common';
import { PRESS_PSEUDO_SELECTORS } from '../../constants';
import type { PseudoStylesBySelector } from '../../utils';

// UIKit skips views under this alpha when hit-testing, so a press selector on one never fires.
const HIT_TEST_ALPHA_THRESHOLD = 0.01;
// The alpha is float-backed, so a written 0.01 lands just below the threshold. Same value the
// touch `:hover` hit test bumps to.
const REACHABLE_OPACITY = 0.02;

export function validatePseudoStyles(
  pseudoStylesBySelector: PseudoStylesBySelector,
  defaultStyle: UnknownRecord,
  componentName: string
) {
  const opacity = defaultStyle.opacity;
  if (
    typeof opacity !== 'number' ||
    // Matches the float narrowing the alpha goes through natively.
    Math.fround(opacity) >= HIT_TEST_ALPHA_THRESHOLD ||
    // SVG hit-tests through its own path, which ignores opacity.
    componentName.startsWith('RNSVG') ||
    !PRESS_PSEUDO_SELECTORS.some(
      (selector) => selector in pseudoStylesBySelector
    )
  ) {
    return;
  }
  logger.warn(
    `A view with "opacity: ${opacity}" won't receive presses on iOS, so its press selector will never activate. ` +
      `Use "opacity: ${REACHABLE_OPACITY}" instead - it is indistinguishable on screen and stays touchable.`
  );
}
