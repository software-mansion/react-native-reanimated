'use strict';

// @ts-expect-error There's no types for this script.
import validateWorkletsVersion from 'react-native-reanimated/scripts/validate-worklets-version';
import { ReanimatedError } from "../common/errors.js";
import { jsVersion as reanimatedVersion } from "./jsVersion.js";
export function assertWorkletsVersion() {
  const result = validateWorkletsVersion(reanimatedVersion);
  if (!result.ok) {
    throw new ReanimatedError(result.message);
  }
}
//# sourceMappingURL=workletsVersion.js.map