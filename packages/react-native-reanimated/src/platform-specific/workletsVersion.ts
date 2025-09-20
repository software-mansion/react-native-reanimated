'use strict';

import validateWorkletsVersion from 'react-native-reanimated/scripts/validate-worklets-version';

import { ReanimatedError } from '../common/errors';
import { jsVersion as reanimatedVersion } from './jsVersion';

export function assertWorkletsVersion() {
  const result = validateWorkletsVersion(reanimatedVersion);

  if (!result.ok) {
    throw new ReanimatedError(result.message);
  }
}
