'use strict';
import {
  runOnUISync,
  toggleSlowAnimationsOnUIRuntime,
} from 'react-native-worklets';

import { IS_WEB, SHOULD_BE_USE_WEB } from './common';
import { initSvgCssSupport } from './css/svg';
import type { IReanimatedModule } from './ReanimatedModule';

export function initializeReanimatedModule(
  ReanimatedModule: IReanimatedModule
) {
  if (!IS_WEB && !ReanimatedModule) {
    throw new Error(
      '[Reanimated] Tried to initialize Reanimated without a valid ReanimatedModule'
    );
  }
  initSvgCssSupport();
}

// is-tree-shakable-suppress
if (!SHOULD_BE_USE_WEB) {
  globalThis.__toggleSlowAnimationsOnUIRuntime = () =>
    toggleSlowAnimationsOnUIRuntime();
  runOnUISync(() => {
    'worklet';
    global._tagToJSPropNamesMapping = {};
  });
}
