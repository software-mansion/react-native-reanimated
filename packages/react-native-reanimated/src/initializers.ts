'use strict';
import { executeOnUIRuntimeSync } from 'react-native-worklets';

import {
  DEFAULT_LOGGER_CONFIG,
  IS_WEB,
  ReanimatedError,
  registerLoggerConfig,
  SHOULD_BE_USE_WEB,
} from './common';
import { initSvgCssSupport } from './css/svg';
import { getStaticFeatureFlag } from './featureFlags';
import type { IReanimatedModule } from './ReanimatedModule';

export function initializeReanimatedModule(
  ReanimatedModule: IReanimatedModule
) {
  if (!IS_WEB && !ReanimatedModule) {
    throw new ReanimatedError(
      'Tried to initialize Reanimated without a valid ReanimatedModule'
    );
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
