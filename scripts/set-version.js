const { getVersion } = require('./releasing');
const { updateVersion } = require('./version-utils');

/**
 * @param {string} packageJsonPath
 * @param {string} jsVersionPath
 */
function setVersion(packageJsonPath, jsVersionPath) {
  if (!process.argv.includes('--package-json-path')) {
    process.argv.push('--package-json-path', packageJsonPath);
  }
  const { currentVersion, newVersion } = getVersion(process.argv);
  updateVersion(packageJsonPath, jsVersionPath, newVersion);
  // Log the current version so it can be restored if needed.
  console.log(currentVersion);
}

module.exports = {
  setVersion,
};
