'use strict';
import './layoutReanimation/animationsManager';

import {
  runOnUISync,
  toggleSlowAnimationsOnUIRuntime,
} from 'react-native-worklets';

import { cssCallbacksRegistry, setCSSEventHandler } from './css/native';
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
  setCSSEventHandler((events) => cssCallbacksRegistry.dispatch(events));
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
