/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable reanimated/use-reanimated-error */
'use strict';

let worklets;

try {
  const resolvedWorklets = require('react-native-worklets');
  // `globalThis.__DISALLOW_WORKLETS_IMPORT` applies only to our monorepo.
  if (resolvedWorklets && !globalThis.__DISALLOW_WORKLETS_IMPORT) {
    worklets = resolvedWorklets;
  }
} catch (_e) {
} finally {
  if (!worklets) {
    worklets = require('../worklets');
  }
}

module.exports = worklets;
