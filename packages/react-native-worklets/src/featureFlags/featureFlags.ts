'use strict';

import type { DynamicFlagName, StaticFeatureFlagsSchema } from './types';

export function getStaticFeatureFlag(
  _name: keyof StaticFeatureFlagsSchema
): boolean {
  return false;
}

export function setDynamicFeatureFlag(
  _name: DynamicFlagName,
  _value: boolean
): void {
  // no-op
}
