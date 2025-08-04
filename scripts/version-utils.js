const fs = require('fs');
const path = require('path');

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

module.exports = {
  updateVersion,
  updatePeerDependency,
};
