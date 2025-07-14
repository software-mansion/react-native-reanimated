'use strict';

const semverSatisfies = require('semver/functions/satisfies');
const semverPrerelease = require('semver/functions/prerelease');
const expectedVersion = require('./worklets-version.json');

/** @returns {{ ok: boolean; message?: string }} */
function validateVersion() {
  let workletsVersion;

  try {
    const { version } = require('react-native-worklets/package.json');
    workletsVersion = version;
  } catch (_e) {
    return {
      ok: false,
      message:
        "react-native-worklets package isn't installed. Please install a version between " +
        expectedVersion.min +
        ' and ' +
        expectedVersion.max +
        ' to use Reanimated 4.',
    };
  }

  if (semverPrerelease(workletsVersion)) {
    /**
     * Don't perform any checks for pre-release versions, like nightlies or
     * feature previews. The user knows what they're doing.
     */
    return { ok: true };
  }

  const acceptedRange = `${expectedVersion.min} - ${expectedVersion.max}`;

  if (!semverSatisfies(workletsVersion, acceptedRange)) {
    return {
      ok: false,
      message: `Invalid version of \`react-native-worklets\`: "${workletsVersion}". Expected the version to be in inclusive range "${acceptedRange}". Please install a compatible version of \`react-native-worklets\`.`,
    };
  }

  return {
    ok: true,
  };
}

module.exports = validateVersion;
