'use strict';
import {
  runOnUISync,
  toggleSlowAnimationsOnUIRuntime,
} from 'react-native-worklets';

import { initSvgCssSupport } from './css/svg';
import { getStaticFeatureFlag } from './featureFlags';
import type { IReanimatedModule } from './ReanimatedModule';

export function initializeReanimatedModule(
  ReanimatedModule: IReanimatedModule
) {
  if (!ReanimatedModule) {
    throw new Error(
      '[Reanimated] Tried to initialize Reanimated without a valid ReanimatedModule'
    );
  }
  if (getStaticFeatureFlag('EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS')) {
    initSvgCssSupport();
  }
}

globalThis.__toggleSlowAnimationsOnUIRuntime = () =>
  toggleSlowAnimationsOnUIRuntime();
runOnUISync(() => {
  'worklet';
  global._tagToJSPropNamesMapping = {};
});
