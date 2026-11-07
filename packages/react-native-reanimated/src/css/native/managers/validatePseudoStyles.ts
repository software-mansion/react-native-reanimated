'use strict';
import type { UnknownRecord } from '../../../common';
import type { PseudoStyleInput } from '../types';

export function validatePseudoStyles(
  _selectors: readonly PseudoStyleInput[],
  _defaultStyle: UnknownRecord,
  _componentName: string
) {
  // Only iOS gates input on opacity, so there is nothing to check elsewhere.
}
