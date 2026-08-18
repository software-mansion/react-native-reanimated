'use strict';
import type { UnknownRecord } from '../../../common';
import { logger } from '../../../common';
import { PRESS_PSEUDO_SELECTORS } from '../../constants';
import type { PseudoStylesBySelector } from '../../utils';

// UIKit skips views below this alpha when hit-testing, so one under it never receives the touch
// its press selector is written for. Android and the web deliver it either way.
const HIT_TEST_ALPHA_THRESHOLD = 0.01;
// The alpha is stored in a float, which puts a written 0.01 just under the threshold. This is the
// alpha the touch `:hover` hit test bumps to for the same reason.
const REACHABLE_OPACITY = 0.02;

export function validatePseudoStyles(
  pseudoStylesBySelector: PseudoStylesBySelector,
  defaultStyle: UnknownRecord
) {
  const opacity = defaultStyle.opacity;
  if (
    typeof opacity !== 'number' ||
    // Mirrors the float the alpha is narrowed to natively, so this matches to the last bit.
    Math.fround(opacity) >= HIT_TEST_ALPHA_THRESHOLD ||
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
