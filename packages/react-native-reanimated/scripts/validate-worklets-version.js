'use strict';

const semverSatisfies = require('semver/functions/satisfies');
const semverPrerelease = require('semver/functions/prerelease');
const semverOutside = require('semver/ranges/outside');
const compatibilityFile = require('../compatibility.json');

const architecture = 'fabric';

/**
 * @param {string} reanimatedVersion
 * @returns {{ ok: boolean; message?: string }}
 */
function validateVersion(reanimatedVersion) {
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

  const earliestSupportedVersion = supportedWorkletsVersions[0];
  const latestSupportedVersion =
    supportedWorkletsVersions[supportedWorkletsVersions.length - 1];

  let workletsVersion;
  try {
    const { version } = require('react-native-worklets/package.json');
    workletsVersion = version;
  } catch (_e) {
    // In pnpm monorepos, the standard require may not resolve correctly from
    // Reanimated's install location. Try resolving from the project root.
    try {
      const resolvedPath = require.resolve('react-native-worklets/package.json', {
        paths: [process.cwd()],
      });
      const { version } = require(resolvedPath);
      workletsVersion = version;
    } catch (_e2) {
      return {
        ok: false,
        message:
          "react-native-worklets package isn't installed. Please install a version between " +
          earliestSupportedVersion +
          ' and ' +
          latestSupportedVersion +
          ' to use Reanimated ' +
          reanimatedVersion +
          '.' +
          ' If you are using a pnpm monorepo, ensure the package is installed' +
          ' in your app directory (not just the workspace root).',
      };
    }
  }

  if (semverPrerelease(workletsVersion)) {
    /**
     * Don't perform any checks for pre-release versions, like nightlies or
     * feature previews. The user knows what they're doing.
     */
    return { ok: true };
  }

  for (const version of supportedWorkletsVersions) {
    if (semverSatisfies(workletsVersion, version)) {
      return { ok: true };
    }
  }

  const isHigher = semverOutside(workletsVersion, latestSupportedVersion, '>');

  const installMessage = isHigher
    ? `Please install the latest supported version of Worklets ${latestSupportedVersion} or older`
    : `Please install Worklets ${earliestSupportedVersion} or newer`;

  const monorepoHint =
    ' If you are using a monorepo (e.g. pnpm workspaces), make sure all apps' +
    ' in the workspace use the same version of react-native-worklets. You can' +
    ' enforce a consistent version using your package manager\'s overrides/' +
    'resolutions field in the root package.json.';

  return {
    ok: false,
    message: `Your installed version of Worklets (${workletsVersion}) is not compatible with installed version of Reanimated (${reanimatedVersion}). ${installMessage}. See the documentation for the list of supported versions: https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/#supported-react-native-worklets-versions${monorepoHint}`,
  };
}

module.exports = validateVersion;
