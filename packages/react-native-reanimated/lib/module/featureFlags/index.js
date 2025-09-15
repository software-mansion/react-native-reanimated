'use strict';

import { logger } from '../common';
import { ReanimatedModule } from '../ReanimatedModule';
/** @knipIgnore */
export const DynamicFlags = {
  EXAMPLE_DYNAMIC_FLAG: false,
  init() {
    Object.keys(DynamicFlags).forEach(key => {
      if (key !== 'init' && key !== 'setFlag') {
        ReanimatedModule.setDynamicFeatureFlag(key, DynamicFlags[key]);
      }
    });
  },
  setFlag(name, value) {
    if (name in DynamicFlags) {
      DynamicFlags[name] = value;
      ReanimatedModule.setDynamicFeatureFlag(name, value);
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
  DISABLE_COMMIT_PAUSING_MECHANISM: false,
  ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: false,
  EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS: false,
  USE_SYNCHRONIZABLE_FOR_MUTABLES: false
};
const staticFeatureFlags = {};
export function getStaticFeatureFlag(name) {
  if (name in staticFeatureFlags) {
    return staticFeatureFlags[name];
  }
  const featureFlagValue = ReanimatedModule.getStaticFeatureFlag(name);
  staticFeatureFlags[name] = featureFlagValue;
  return featureFlagValue;
}
//# sourceMappingURL=index.js.map