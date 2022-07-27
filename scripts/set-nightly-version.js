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

const packageJson = JSON.parse(cat('package.json'));
packageJson.version = version;

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2), 'utf-8');
