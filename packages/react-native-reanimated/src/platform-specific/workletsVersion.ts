'use strict';

import semverSatisfies from 'semver/functions/satisfies';

import { ReanimatedError } from '../errors';
import { acceptedWorkletsVersion } from './jsVersion';

export function assertWorkletsVersion() {
  let workletsVersion: string | undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version } = require('react-native-worklets/package.json');
    workletsVersion = version;
  } catch (e) {
    throw new ReanimatedError(
      "react-native-worklets package isn't installed. Please install it to use Reanimated."
    );
  }

  workletsVersion = workletsVersion!;

  if (workletsVersion.includes('nightly')) {
    // Don't perform any checks for nightly versions, the user knows what they're doing.
    return;
  }

  const acceptedRange = `${acceptedWorkletsVersion.min} - ${acceptedWorkletsVersion.max}`;

  if (!semverSatisfies(workletsVersion, acceptedRange)) {
    throw new ReanimatedError(
      `Invalid version of react-native-worklets: ${workletsVersion}. Expected the version to be in inclusive range ${acceptedRange}. Please install a compatible version of react-native-worklets.`
    );
  }
}
