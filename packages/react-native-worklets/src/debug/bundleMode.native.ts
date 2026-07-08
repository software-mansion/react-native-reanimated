'use strict';

import type { WorkletFunction } from '../types';

// Worklets Babel Plugin replaces `false` with `true` here
// when Bundle Mode is enabled.
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
