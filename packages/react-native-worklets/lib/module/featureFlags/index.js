'use strict';

import { logger } from "../logger.js";
import { WorkletsModule } from "../WorkletsModule/index.js";
export const DynamicFlags = {
  EXAMPLE_DYNAMIC_FLAG: true,
  init() {
    Object.keys(DynamicFlags).forEach(key => {
      if (key !== 'init' && key !== 'setFlag') {
        WorkletsModule.setDynamicFeatureFlag(key, DynamicFlags[key]);
      }
    });
  },
  setFlag(name, value) {
    if (name in DynamicFlags) {
      DynamicFlags[name] = value;
      WorkletsModule.setDynamicFeatureFlag(name, value);
    } else {
      logger.warn(`The feature flag: '${name}' no longer exists, you can safely remove invocation of \`setDynamicFeatureFlag('${name}')\` from your code.`);
    }
  }
};
DynamicFlags.init();
// Public API function to update a feature flag
export function setDynamicFeatureFlag(name, value) {
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
  IOS_DYNAMIC_FRAMERATE_ENABLED: false
};
const staticFeatureFlags = {};
export function getStaticFeatureFlag(name) {
  if (name in staticFeatureFlags) {
    return staticFeatureFlags[name];
  }
  const featureFlagValue = WorkletsModule.getStaticFeatureFlag(name);
  staticFeatureFlags[name] = featureFlagValue;
  return featureFlagValue;
}
//# sourceMappingURL=index.js.map