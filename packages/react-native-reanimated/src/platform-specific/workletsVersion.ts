/* eslint-disable n/no-missing-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

import { ReanimatedError } from '../common/errors';

export function assertWorkletsVersion() {
  const result =
    require('react-native-reanimated/scripts/validate-worklets-version')();

  if (!result.ok) {
    throw new ReanimatedError(result.message);
  }
}
