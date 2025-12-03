'use strict';
import { logger } from '../common';
import { ReanimatedModule } from '../ReanimatedModule';
import type StaticFeatureFlagsJSON from './staticFlags.json';

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

/**
 * This constant is needed for typechecking and preserving static typechecks in
 * generated .d.ts files. Without it, the static flags resolve to an object
 * without specific keys.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DefaultStaticFeatureFlags = {
  RUNTIME_TEST_FLAG: false,
  DISABLE_COMMIT_PAUSING_MECHANISM: false,
  ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: false,
  IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS: false,
  EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS: false,
  USE_SYNCHRONIZABLE_FOR_MUTABLES: false,
  USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS: false,
  ENABLE_SHARED_ELEMENT_TRANSITIONS: false,
  FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS: false,
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
  const featureFlagValue = ReanimatedModule.getStaticFeatureFlag(name);
  staticFeatureFlags[name] = featureFlagValue;
  return featureFlagValue;
}
