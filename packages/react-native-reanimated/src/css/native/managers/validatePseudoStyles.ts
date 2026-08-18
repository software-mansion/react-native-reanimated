'use strict';
import type { UnknownRecord } from '../../../common';
import type { PseudoStylesBySelector } from '../../utils';

export function validatePseudoStyles(
  _pseudoStylesBySelector: PseudoStylesBySelector,
  _defaultStyle: UnknownRecord
) {
  // Only iOS restricts which views may receive input, so there is nothing to check anywhere else.
}
