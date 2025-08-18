const fs = require('fs');
const path = require('path');
const semverSatisfies = require('semver/functions/satisfies');

/**
 * Updates the package.json version and jsVersion file
 *
 * @param {string} packageJsonPath - Path to package.json
 * @param {string} jsVersionPath - Path to jsVersion.ts file
 * @param {string} newVersion - New version to set
 * @returns {string} The previous version that was replaced
 */
function updateVersion(packageJsonPath, jsVersionPath, newVersion) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = packageJson.version;
  packageJson.version = newVersion;
  const newPackageJson = JSON.stringify(packageJson, null, 2) + '\n';
  fs.writeFileSync(packageJsonPath, newPackageJson, 'utf-8');

  const before = fs.readFileSync(jsVersionPath, 'utf-8');
  const after = before.replace(
    /jsVersion = '(.*)';/g,
    `jsVersion = '${newVersion}';`
  );
  fs.writeFileSync(jsVersionPath, after, 'utf-8');

  return currentVersion;
}

/**
 * Updates peer dependencies in package.json
 *
 * @param {string} packageJsonPath - Path to package.json
 * @param {string} dependencyName - Name of the dependency
 * @param {string} newVersion - New version to set
 */
function updatePeerDependency(packageJsonPath, dependencyName, newVersion) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  if (!packageJson.peerDependencies) {
    packageJson.peerDependencies = {};
  }

  packageJson.peerDependencies[dependencyName] = newVersion;

  const newPackageJson = JSON.stringify(packageJson, null, 2) + '\n';
  fs.writeFileSync(packageJsonPath, newPackageJson, 'utf-8');
}

/**
 * Validates React Native version compatibility
 *
 * @param {string} packageVersion - Version of the package
 * @param {string} reactNativeVersion - React Native version to validate
 * @param {Object} compatibilityJSON - Compatibility configuration object
 * @returns {boolean}
 */
function validateReactNativeVersion(packageVersion, reactNativeVersion, compatibilityJSON) {
  const supportedRNVersions = [];

  for (const key in compatibilityJSON) {
    if (semverSatisfies(packageVersion, key)) {
      // @ts-ignore
      supportedRNVersions.push(...compatibilityJSON[key]['react-native']);
    }
  }

  // If user uses a version that is not listed in the compatibility file, we skip the check
  if (supportedRNVersions.length === 0) {
    return true;
  }

  for (const version of supportedRNVersions) {
    if (semverSatisfies(reactNativeVersion, `${version}.x`)) {
      return true;
    }
  }

  return false;
}

module.exports = {
  updateVersion,
  updatePeerDependency,
  validateReactNativeVersion,
};
