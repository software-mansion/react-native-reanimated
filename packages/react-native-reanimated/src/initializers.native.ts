'use strict';
import './layoutReanimation/animationsManager';

import {
  runOnUISync,
  toggleSlowAnimationsOnUIRuntime,
} from 'react-native-worklets';

import { IS_JEST, logger } from './common';
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
  if (IS_JEST) {
    // Under Jest the ReanimatedModule is JSReanimated, which has no CSS
    // support - registering the CSS event handler would throw on import.
    // This file is only reached in Jest when the Jest resolver is not
    // configured (with it, the web variant of this file is used instead).
    logger.warn(
      "Reanimated's native module files were loaded in a Jest environment. " +
        "Add `resolver: 'react-native-reanimated/jest/resolver'` to your Jest " +
        'config so the web implementation is used. See ' +
        'https://docs.swmansion.com/react-native-reanimated/docs/guides/testing for details.'
    );
    return;
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
