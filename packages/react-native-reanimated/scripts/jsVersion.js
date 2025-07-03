'use strict';

import workletsVersion from './workletsVersion.json';

/**
 * Extra checks for conforming with the version of `react-native-worklets`. Even
 * if the App compiles there could be ABI mismatches.
 */

/** @type {{ min: string; max: string }} */
export const acceptedWorkletsVersion = {
  min: /** @type {string} */ (workletsVersion.min),
  max: /** @type {string} */ (workletsVersion.max),
};
