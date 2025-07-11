/* eslint-disable reanimated/use-logger */
'use strict';

const semverSatisfies = require('semver/functions/satisfies');
const semverPrerelease = require('semver/functions/prerelease');
const expectedVersion = require('./worklets-version.json');
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

  if (semverPrerelease(workletsVersion)) {
    /**
     * Don't perform any checks for pre-release versions, like nightlies or
     * feature previews. The user knows what they're doing.
     */
    return;
  }

  const acceptedRange = `${expectedVersion.min} - ${expectedVersion.max}`;

  if (!semverSatisfies(workletsVersion, acceptedRange)) {
    console.error(
      `[Reanimated] Invalid version of \`react-native-worklets\`: "${workletsVersion}". Expected the version to be in inclusive range "${acceptedRange}". Please install a compatible version of \`react-native-worklets\`.`
    );
    exit(2);
  }
}

assertWorkletsVersion();
