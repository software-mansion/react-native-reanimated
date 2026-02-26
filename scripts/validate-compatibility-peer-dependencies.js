'use strict';

const fs = require('node:fs');
const path = require('node:path');
const semver = require('semver');

let status = 0;

function main() {
  const packageJson = readJson('package.json');
  const packageVersion = packageJson.version;
  const peerDeps = packageJson.peerDependencies;

  const reactNativePeerRange = semver.validRange(peerDeps['react-native']);
  if (!reactNativePeerRange) {
    throw new Error(
      `Invalid semver range for react-native peer dependency: "${peerDeps['react-native']}".`
    );
  }

  const compatibility = readJson('compatibility.json');
  const currentCompatibility = getCurrentCompatibility(
    compatibility?.fabric || compatibility,
    packageVersion
  );
  const compatibilityReactNativeRange = getRangeFromCompatibility(
    currentCompatibility['react-native']
  );

  validateRanges(
    'react-native',
    reactNativePeerRange,
    compatibilityReactNativeRange
  );

  if (!semver.prerelease(packageVersion) && peerDeps['react-native-worklets']) {
    const workletsPeerRange = semver.validRange(
      peerDeps['react-native-worklets']
    );
    if (!workletsPeerRange) {
      throw new Error(
        `Invalid semver range for react-native-worklets peer dependency: "${peerDeps['react-native-worklets']}".`
      );
    }

    const compatibilityWorkletsRange = getRangeFromCompatibility(
      currentCompatibility['react-native-worklets']
    );

    validateRanges(
      'react-native-worklets',
      workletsPeerRange,
      compatibilityWorkletsRange
    );
  }
}

/**
 * @param {string} library
 * @param {string | semver.Range} range1
 * @param {string | semver.Range} range2
 */
function validateRanges(library, range1, range2) {
  if (!semver.subset(range1, range2) || !semver.subset(range2, range1)) {
    console.error(
      `Mismatch between ${library} peer dependency ranges: "${range1}" vs "${range2}".`
    );
    status = 1;
  }
}

/**
 * @param {string} filePath
 * @returns {any} Parsed JSON content of the file at the given relative path.
 */
function readJson(filePath) {
  const resolvedPath = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
}

/**
 * @param {{ [x: string]: any }} compatibility
 * @param {string} packageVersion
 * @returns {Record<string, string[]>} Compatibility data for the given version.
 */
function getCurrentCompatibility(compatibility, packageVersion) {
  if (packageVersion.includes('main') || packageVersion.includes('nightly')) {
    return compatibility['nightly'];
  }
  for (const range in compatibility) {
    if (semver.satisfies(packageVersion, range)) {
      return compatibility[range];
    }
  }
  throw new Error(
    `No compatibility data found for version "${packageVersion}".`
  );
}

/**
 * @param {string[]} versions
 * @returns {string} A semver range string that represents the given list of
 *   versions.
 */
function getRangeFromCompatibility(versions) {
  if (versions.length === 1) {
    return versions[0];
  }
  const range = semver.validRange(
    versions[0] + ' - ' + versions[versions.length - 1]
  );
  if (!range) {
    throw new Error(
      `Invalid version range generated from compatibility data: "${versions[0]} - ${versions[versions.length - 1]}".`
    );
  }
  return range;
}

main();
