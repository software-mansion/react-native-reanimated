const fs = require('fs');
const path = require('path');
const { getFlags, getVersion } = require('../../../scripts/releasing');

const packageJsonPath = path.resolve(__dirname, '../package.json');

const { argv } = process;
const { currentVersion, newVersion } = getVersion(argv, packageJsonPath);
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

packageJson.version = newVersion;

if (getFlags(argv).flags.nightly) {
  const workletsPackageJsonPath = path.resolve(
    __dirname,
    '../../react-native-worklets/package.json'
  );
  const { newVersion: newWorkletsVersion } = getVersion(
    argv,
    workletsPackageJsonPath
  );

  packageJson.peerDependencies['react-native-worklets'] = newWorkletsVersion;
}

const newPackageJson = JSON.stringify(packageJson, null, 2) + '\n';
fs.writeFileSync(packageJsonPath, newPackageJson, 'utf-8');

const jsVersionPath = path.resolve(
  __dirname,
  '../src/platform-specific/jsVersion.ts'
);
const before = fs.readFileSync(jsVersionPath, 'utf-8');
const after = before.replace(
  /jsVersion = '(.*)';/g,
  `jsVersion = '${newVersion}';`
);
fs.writeFileSync(jsVersionPath, after, 'utf-8');

// Log the current version so it can be restored if needed.
console.log(currentVersion);
