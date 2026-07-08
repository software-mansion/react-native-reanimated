'use strict';

import type { WorkletFunction } from '../types';

globalThis._WORKLETS_BUNDLE_MODE_ENABLED = false;

export function isBundleModeEnabled(): boolean {
  return (
    globalThis._WORKLETS_BUNDLE_MODE_ENABLED === true &&
    (
      (() => {
        'worklet';
      }) as WorkletFunction
    ).__initData === undefined
  );
}
