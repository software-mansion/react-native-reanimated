const fs = require('fs');
const { cat, exec } = require('shelljs');

const helpInfo =
  'Use --nightly or -n to set nightly version.\nUse --fresh or -f to set fresh version.\nElse pass the version number as an argument.';

if (process.argv[2] === '--help' || process.argv[2] === '-h') {
  console.log(helpInfo);
  return;
}

const mode = process.argv[2];
const IS_NIGHTLY = mode === '--nightly' || mode === '-n';
const IS_FRESH = mode === '--fresh' || mode === '-f';
const IS_SET_CUSTOM = !IS_NIGHTLY && !IS_FRESH;

const packageJsonPath = 'package.json';
const packageJson = JSON.parse(cat(packageJsonPath));
const currentVersion = packageJson.version;

if (process.argv.length < 3) {
  return currentVersion;
}

let version;
if (IS_SET_CUSTOM) {
  version = process.argv[2];
} else {
  let dateIdentifier = new Date()
    .toISOString()
    .slice(0, -5)
    .replace(/[-:T]/g, '');

  if (IS_NIGHTLY) {
    if (currentVersion.includes('nightly')) {
      throw new Error('Cannot set nightly version on nightly version');
    }

    dateIdentifier = dateIdentifier.slice(0, -6);
    const currentCommit = exec('git rev-parse HEAD', {
      silent: true,
    }).stdout.trim();
    const shortCommit = currentCommit.slice(0, 9);

    const [major, minor, patch] = currentVersion.split('.');
    const nextMinor = Number(minor) + 1;
    version = `${major}.${nextMinor}.${patch}-nightly-${dateIdentifier}-${shortCommit}`;
  } else if (IS_FRESH) {
    version = `${currentVersion}-${dateIdentifier}`;
  }
}

packageJson.version = version;

fs.writeFileSync(
  packageJsonPath,
  JSON.stringify(packageJson, null, 2) + '\n',
  'utf-8'
);

const jsVersionPath = 'src/reanimated2/platform-specific/jsVersion.ts';
const before = cat(jsVersionPath);
const after = before.replace(
  /jsVersion = '(.*)';/g,
  `jsVersion = '${version}';`
);
fs.writeFileSync(jsVersionPath, after, 'utf-8');

console.log(currentVersion);
return currentVersion;
