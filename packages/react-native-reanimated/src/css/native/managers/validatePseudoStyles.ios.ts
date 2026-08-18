'use strict';
import type { UnknownRecord } from '../../../common';
import { logger } from '../../../common';
import { PRESS_PSEUDO_SELECTORS } from '../../constants';
import type { PseudoStylesBySelector } from '../../utils';

// UIKit skips views below this alpha when hit-testing, so a fully transparent one never receives
// the touch its press selector is written for. Android and the web deliver it either way.
const MIN_HIT_TESTABLE_OPACITY = 0.01;

export function validatePseudoStyles(
  pseudoStylesBySelector: PseudoStylesBySelector,
  defaultStyle: UnknownRecord
) {
  const opacity = defaultStyle.opacity;
  if (
    typeof opacity !== 'number' ||
    opacity >= MIN_HIT_TESTABLE_OPACITY ||
    !PRESS_PSEUDO_SELECTORS.some(
      (selector) => selector in pseudoStylesBySelector
    )
  ) {
    return;
  }
  logger.warn(
    `A view with "opacity: ${opacity}" won't receive presses on iOS, so its press selector will never activate. ` +
      `Use "opacity: ${MIN_HIT_TESTABLE_OPACITY}" instead - it is indistinguishable on screen and stays touchable.`
  );
}
