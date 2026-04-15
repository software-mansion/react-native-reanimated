'use strict';

// @ts-expect-error There's no types for this script.
import validateWorkletsVersion from 'react-native-reanimated/scripts/validate-worklets-version';

import { jsVersion as reanimatedVersion } from './jsVersion';

export function assertWorkletsVersion() {
  const result = validateWorkletsVersion(reanimatedVersion);

  if (!result.ok) {
    throw new Error(`[Reanimated] ${result.message}`);
  }
}
