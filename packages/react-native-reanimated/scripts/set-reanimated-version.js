const fs = require('fs');
const { cat, exec } = require('shelljs');

let IS_HELP = false;
let IS_NIGHTLY = false;
let IS_FRESH = false;

process.argv.forEach((arg) => {
  if (arg === '--help' || arg === '-h') {
    IS_HELP = true;
  } else if (arg === '--nightly' || arg === '-n') {
    IS_NIGHTLY = true;
  } else if (arg === '--fresh' || arg === '-f') {
    IS_FRESH = true;
  }
});

if (IS_HELP) {
  console.warn(
    'Use --nightly or -n to set nightly version.\nUse --fresh or -f to set fresh version.\nElse pass the version as an argument.'
  );
  process.exitCode = 1;
  return;
}

if (IS_NIGHTLY && IS_FRESH) {
  throw new Error('Cannot set nightly and fresh version at the same time');
}

const IS_SET_CUSTOM = !IS_NIGHTLY && !IS_FRESH;

const packageJsonPath = 'package.json';
const packageJson = JSON.parse(cat(packageJsonPath));
const currentVersion = packageJson.version;

if (process.argv.length < 3) {
  console.log(currentVersion);
  return;
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

    version = `${currentVersion}-nightly-${dateIdentifier}-${shortCommit}`;
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

const jsVersionPath = 'src/platform-specific/jsVersion.ts';
const before = cat(jsVersionPath);
const after = before.replace(
  /jsVersion = '(.*)';/g,
  `jsVersion = '${version}';`
);
fs.writeFileSync(jsVersionPath, after, 'utf-8');

console.log(currentVersion);
