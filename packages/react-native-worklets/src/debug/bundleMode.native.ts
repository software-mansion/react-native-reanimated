'use strict';

import type { WorkletFunction } from '../types';

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
