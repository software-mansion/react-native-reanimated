'use strict';

const semverSatisfies = require('semver/functions/satisfies');
const semverPrerelease = require('semver/functions/prerelease');
const expectedVersion = require('./worklets-version.json');
const compatibilityFile = require('../compatibility.json');

/** @returns {{ ok: boolean; message?: string }} */
function validateVersion(reanimatedVersion) {
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
        ' to use Reanimated ' +
        reanimatedVersion +
        '.',
    };
  }

  if (semverPrerelease(workletsVersion)) {
    /**
     * Don't perform any checks for pre-release versions, like nightlies or
     * feature previews. The user knows what they're doing.
     */
    return { ok: true };
  }

  const supportedWorkletsVersions = [];

  for (const key in compatibilityFile) {
    if (semverSatisfies(reanimatedVersion, key)) {
      // @ts-ignore
      supportedWorkletsVersions.push(
        ...compatibilityFile[key]['react-native-worklets']
      );
    }
  }

  if (supportedWorkletsVersions.length === 0) {
    return { ok: true };
  }

  for (const version of supportedWorkletsVersions) {
    if (semverSatisfies(workletsVersion, version)) {
      return { ok: true };
    }
  }

  return {
    ok: false,
    message: `Invalid version of \`react-native-worklets\`: "${workletsVersion}". Expected the version to be in inclusive range "${supportedWorkletsVersions.join(', ')}". Please install a compatible version of \`react-native-worklets\`.`,
  };
}

module.exports = validateVersion;
