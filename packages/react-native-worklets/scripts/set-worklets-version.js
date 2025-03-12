const fs = require('fs');
const path = require('path');
const getVersion = require('../../../scripts/releasing').getVersion;

const packageJsonPath = path.resolve(__dirname, '../package.json');

const { currentVersion, newVersion } = getVersion(
  process.argv,
  packageJsonPath
);

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
packageJson.version = newVersion;
const newPackageJson = JSON.stringify(packageJson, null, 2) + '\n';
fs.writeFileSync(packageJsonPath, newPackageJson, 'utf-8');

// Log the current version so it can be restored if needed.
console.log(currentVersion);
