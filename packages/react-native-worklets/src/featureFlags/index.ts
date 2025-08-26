'use strict';
import { logger } from '../logger';
import { WorkletsModule } from '../WorkletsModule';
import type StaticFeatureFlagsJSON from './staticFlags.json';

type DynamicFlagsType = {
  EXAMPLE_DYNAMIC_FLAG: boolean;
  init(): void;
  setFlag(name: DynamicFlagName, value: boolean): void;
};
type DynamicFlagName = keyof Omit<Omit<DynamicFlagsType, 'setFlag'>, 'init'>;

export const DynamicFlags: DynamicFlagsType = {
  EXAMPLE_DYNAMIC_FLAG: true,

  init() {
    Object.keys(DynamicFlags).forEach((key) => {
      if (key !== 'init' && key !== 'setFlag') {
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
};
DynamicFlags.init();
// Public API function to update a feature flag
export function setDynamicFeatureFlag(
  name: DynamicFlagName,
  value: boolean
): void {
  DynamicFlags.setFlag(name, value);
}

/**
 * This constant is needed for typechecking and preserving static typechecks in
 * generated .d.ts files. Without it, the static flags resolve to an object
 * without specific keys.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DefaultStaticFeatureFlags = {
  RUNTIME_TEST_FLAG: false,
  IOS_DYNAMIC_FRAMERATE_ENABLED: false,
} as const satisfies typeof StaticFeatureFlagsJSON;

type StaticFeatureFlagsSchema = {
  -readonly [K in keyof typeof DefaultStaticFeatureFlags]: boolean;
};

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
