'use strict';
import { logger } from '../common';
import { ReanimatedModule } from '../ReanimatedModule';
import type { StaticFeatureFlagsSchema } from './staticFeatureFlags';

type DynamicFlagsType = {
  EXAMPLE_DYNAMIC_FLAG: boolean;
  init(): void;
  setFlag(name: DynamicFlagName, value: boolean): void;
  getFlag(name: DynamicFlagName): boolean;
};
type DynamicFlagName = keyof Omit<
  Omit<DynamicFlagsType, 'setFlag' | 'getFlag'>,
  'init'
>;

/** @knipIgnore */
export const DynamicFlags: DynamicFlagsType = {
  EXAMPLE_DYNAMIC_FLAG: true,

  init() {
    Object.keys(DynamicFlags).forEach((key) => {
      if (key !== 'init' && key !== 'setFlag' && key !== 'getFlag') {
        ReanimatedModule.setDynamicFeatureFlag(
          key,
          DynamicFlags[key as DynamicFlagName]
        );
      }
    });
  },
  setFlag(name, value) {
    if (name in DynamicFlags) {
      DynamicFlags[name] = value;
      ReanimatedModule.setDynamicFeatureFlag(name, value);
    } else {
      logger.warn(
        `The feature flag: '${name}' no longer exists, you can safely remove invocation of \`setDynamicFeatureFlag('${name}')\` from your code.`
      );
    }
  },
  getFlag(name) {
    if (name in DynamicFlags) {
      return DynamicFlags[name];
    } else {
      logger.warn(
        `The feature flag: '${name}' no longer exists, you can safely remove invocation of \`getDynamicFeatureFlag('${name}')\` from your code.`
      );
      return false;
    }
  },
};
// is-tree-shakable-suppress
DynamicFlags.init();

// Public API function to update a feature flag
export function setDynamicFeatureFlag(
  name: DynamicFlagName,
  value: boolean
): void {
  DynamicFlags.setFlag(name, value);
}

// Public API function to read a feature flag
export function getDynamicFeatureFlag(name: DynamicFlagName): boolean {
  return DynamicFlags.getFlag(name);
}

const staticFeatureFlags: Partial<StaticFeatureFlagsSchema> = {};

export function getStaticFeatureFlag(
  name: keyof StaticFeatureFlagsSchema
): boolean {
  if (name in staticFeatureFlags) {
    return staticFeatureFlags[name]!;
  }
  const featureFlagValue = ReanimatedModule.getStaticFeatureFlag(name);
  staticFeatureFlags[name] = featureFlagValue;
  return featureFlagValue;
}
