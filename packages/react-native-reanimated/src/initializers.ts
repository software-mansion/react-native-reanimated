'use strict';
import { executeOnUIRuntimeSync } from 'react-native-worklets';

import { IS_WEB, ReanimatedError, SHOULD_BE_USE_WEB } from './common';
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

if (!SHOULD_BE_USE_WEB) {
  executeOnUIRuntimeSync(() => {
    'worklet';
    global._tagToJSPropNamesMapping = {};
  })();
}
