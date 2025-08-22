'use strict';
import { executeOnUIRuntimeSync } from 'react-native-worklets';

import {
  DEFAULT_LOGGER_CONFIG,
  IS_WEB,
  registerLoggerConfig,
  SHOULD_BE_USE_WEB,
} from './common';
import { initSvgCssSupport } from './css/svg';
import { EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS } from './featureFlags/staticFlags.json';
import type { IReanimatedModule } from './ReanimatedModule';

export function initializeReanimatedModule(
  ReanimatedModule: IReanimatedModule
) {
  if (EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS) {
    initSvgCssSupport();
  }
  if (IS_WEB) {
    return;
  }
  if (!ReanimatedModule) {
    throw new ReanimatedError(
      'Tried to initialize Reanimated without a valid ReanimatedModule'
    );
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
