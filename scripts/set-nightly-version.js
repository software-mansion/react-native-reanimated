const fs = require('fs');
const { cat, exec } = require('shelljs');

const dateIdentifier = new Date()
  .toISOString()
  .slice(0, -14)
  .replace(/[-:]/g, '');

const currentCommit = exec('git rev-parse HEAD', {
  silent: true,
}).stdout.trim();
const shortCommit = currentCommit.slice(0, 9);

const version = `0.0.0-${dateIdentifier}-${shortCommit}`;

const packageJsonPath = 'package.json';
const packageJson = JSON.parse(cat(packageJsonPath));
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
