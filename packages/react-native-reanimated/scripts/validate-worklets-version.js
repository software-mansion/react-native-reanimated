/* eslint-disable reanimated/use-reanimated-error */
'use strict';

const semverSatisfies = require('semver/functions/satisfies');
const expectedVersion = require('./workletsVersion.json');
const { exit } = require('process');

function assertWorkletsVersion() {
  let workletsVersion;

  try {
    const { version } = require('react-native-worklets/package.json');
    workletsVersion = version;
  } catch (_e) {
    console.error(
      "[Reanimated] react-native-worklets package isn't installed. Please install a version between " +
        expectedVersion.min +
        ' and ' +
        expectedVersion.max +
        ' to use Reanimated 4.'
    );
    exit(1);
  }

  if (workletsVersion.includes('nightly')) {
    // Don't perform any checks for nightly versions, the user knows what they're doing.
    return;
  }

  const acceptedRange = `"${expectedVersion.min}" - "${expectedVersion.max}"`;

  if (!semverSatisfies(workletsVersion, acceptedRange)) {
    console.error(
      `[Reanimated] Invalid version of \`react-native-worklets\`: "${workletsVersion}". Expected the version to be in inclusive range ${acceptedRange}. Please install a compatible version of \`react-native-worklets\`.`
    );
    exit(2);
  }
}

assertWorkletsVersion();
