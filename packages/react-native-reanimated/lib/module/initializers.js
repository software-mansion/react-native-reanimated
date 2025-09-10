'use strict';

import { executeOnUIRuntimeSync } from 'react-native-worklets';
import { DEFAULT_LOGGER_CONFIG, IS_WEB, registerLoggerConfig, SHOULD_BE_USE_WEB } from "./common/index.js";
import { initSvgCssSupport } from "./css/svg/index.js";
import { getStaticFeatureFlag } from "./featureFlags/index.js";
export function initializeReanimatedModule(ReanimatedModule) {
  if (!IS_WEB && !ReanimatedModule) {
    throw new ReanimatedError('Tried to initialize Reanimated without a valid ReanimatedModule');
  }
  if (getStaticFeatureFlag('EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS')) {
    initSvgCssSupport();
  }
}
registerLoggerConfig(DEFAULT_LOGGER_CONFIG);
if (!SHOULD_BE_USE_WEB) {
  executeOnUIRuntimeSync(() => {
    'worklet';

    global._tagToJSPropNamesMapping = {};
    registerLoggerConfig(DEFAULT_LOGGER_CONFIG);
  })();
}
//# sourceMappingURL=initializers.js.map