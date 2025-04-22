'use strict';
/**
 * We hardcode the version of Reanimated here in order to compare it with the
 * version used to build the native part of the library in runtime. Remember to
 * keep this in sync with the version declared in `package.json`
 */
export const jsVersion = '4.0.0-beta.3';
/**
 * Extra checks for comforming with the version of `react-native-worklets`. Even
 * if the App compiles there could be ABI mismatches.
 */
export const acceptedWorkletsVerison = {
  min: '0.3.0' satisfies ValidVersion,
  // TODO: Placeholding "infinity" version for now.
  // Set it to a proper value when releasing stable Reanimated 4.
  max: '1000.0.0' satisfies ValidVersion,
};

type ValidVersion = `${number}.${number}.${number}`;
