'use strict';

import { getStaticFeatureFlag } from './featureFlags';

const ROUTE_SCROLL_DRIVEN_UPDATES_TO_COMMITS = getStaticFeatureFlag(
  'ROUTE_SCROLL_DRIVEN_UPDATES_TO_COMMITS'
);

export function withScrollDrivenWrites(write: () => void) {
  'worklet';
  if (!ROUTE_SCROLL_DRIVEN_UPDATES_TO_COMMITS) {
    write();
    return;
  }
  const wasScrollDrivenWrite = globalThis.__isScrollDrivenWrite;
  globalThis.__isScrollDrivenWrite = true;
  try {
    write();
  } finally {
    globalThis.__isScrollDrivenWrite = wasScrollDrivenWrite;
  }
}
