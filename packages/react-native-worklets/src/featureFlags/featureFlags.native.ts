'use strict';
import { logger } from '../debug/logger';
import { WorkletsModule } from '../WorkletsModule/NativeWorklets';
import type {
  DynamicFlagName,
  DynamicFlagsType,
  StaticFeatureFlagsSchema,
} from './types';

export const DynamicFlags: DynamicFlagsType = {
  EXAMPLE_DYNAMIC_FLAG: true,

  init() {
    Object.keys(DynamicFlags).forEach((key) => {
      if (key !== 'init' && key !== 'setFlag' && key !== 'getFlag') {
        WorkletsModule.setDynamicFeatureFlag(
          key,
          DynamicFlags[key as DynamicFlagName]
        );
      }
    });
  },
  setFlag(name, value) {
    if (name in DynamicFlags) {
      DynamicFlags[name] = value;
      WorkletsModule.setDynamicFeatureFlag(name, value);
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
  const featureFlagValue = WorkletsModule.getStaticFeatureFlag(name);
  staticFeatureFlags[name] = featureFlagValue;
  return featureFlagValue;
}
