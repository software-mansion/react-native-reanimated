'use strict';

// @ts-expect-error There's no types for this script.
import validateWorkletsVersion from 'react-native-reanimated/scripts/validate-worklets-version';

import { ReanimatedError } from '../common/errors';

export function assertWorkletsVersion() {
  const result = validateWorkletsVersion();

  if (!result.ok) {
    throw new ReanimatedError(result.message);
  }
}
