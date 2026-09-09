'use strict';
import type { UnknownRecord } from '../../../common';
import type { PseudoStylesBySelector } from '../../utils';

export function validatePseudoStyles(
  _pseudoStylesBySelector: PseudoStylesBySelector,
  _defaultStyle: UnknownRecord,
  _componentName: string
) {
  // Only iOS gates input on opacity, so there is nothing to check elsewhere.
}
