'use strict';

const semverSatisfies = require('semver/functions/satisfies');
const semverPrerelease = require('semver/functions/prerelease');
const semverOutside = require('semver/ranges/outside');
const expectedVersion = require('./worklets-version.json');
const compatibilityFile = require('../compatibility.json');

const architecture = 'fabric';

/**
 * @param {string} reanimatedVersion
 * @returns {{ ok: boolean; message?: string }}
 */
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

  for (const key in compatibilityFile[architecture]) {
    if (semverSatisfies(reanimatedVersion, key)) {
      supportedWorkletsVersions.push(
        // @ts-ignore
        ...compatibilityFile[architecture][key]['react-native-worklets']
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

  const earliestSupportedVersion = supportedWorkletsVersions[0];
  const latestSupportedVersion =
    supportedWorkletsVersions[supportedWorkletsVersions.length - 1];

  const isHigher = semverOutside(workletsVersion, latestSupportedVersion, '>');

  const installMessage = isHigher
    ? `Please install the latest supported version of Worklets ${latestSupportedVersion} or older`
    : `Please install Worklets ${earliestSupportedVersion} or newer`;

  return {
    ok: false,
    message: `Your installed version of Worklets (${workletsVersion}) is not compatible with installed version of Reanimated (${reanimatedVersion}). ${installMessage}. See the documentation for the list of supported versions: https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/#supported-react-native-worklets-versions`,
  };
}

module.exports = validateVersion;
