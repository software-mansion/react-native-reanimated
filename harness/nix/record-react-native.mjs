import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const packagePath = resolve(root, 'package.json');
const catalogPath = resolve(root, 'harness/nix/react-native-versions.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const requestedVersion =
  process.argv[2] ?? packageJson.devDependencies?.['react-native'];

if (!requestedVersion) {
  throw new Error(
    'No React Native version was provided or found in package.json.'
  );
}
if (catalog.versions[requestedVersion]) {
  console.log(`React Native ${requestedVersion} is already recorded.`);
  process.exit(0);
}

function prefetch(url) {
  console.log(`Fetching ${url}`);
  return JSON.parse(
    execFileSync(
      'nix',
      [
        '--extra-experimental-features',
        'nix-command flakes',
        'store',
        'prefetch-file',
        '--json',
        url,
      ],
      { encoding: 'utf8' }
    )
  );
}

function readArchiveFile(archive, path) {
  return execFileSync('tar', ['-xOf', archive, path], {
    encoding: 'utf8',
  }).trim();
}

function readTomlVersion(toml, name) {
  const match = toml.match(new RegExp(`^${name}\\s*=\\s*"([^"]+)"`, 'm'));
  if (!match) {
    throw new Error(
      `React Native does not declare ${name} in gradle/libs.versions.toml.`
    );
  }
  return match[1];
}

const reactNativeUrl = `https://registry.npmjs.org/react-native/-/react-native-${requestedVersion}.tgz`;
const reactNative = prefetch(reactNativeUrl);
const hermesTag = readArchiveFile(
  reactNative.storePath,
  'package/sdks/.hermesv1version'
);
const hermesVersion = hermesTag.replace(/^hermes-v/, '');
const versionsToml = readArchiveFile(
  reactNative.storePath,
  'package/gradle/libs.versions.toml'
);
const follyVersion = readTomlVersion(versionsToml, 'folly');
const fbjniVersion = readTomlVersion(versionsToml, 'fbjni');
const hermes = prefetch(
  `https://github.com/facebook/hermes/archive/refs/tags/${hermesTag}.tar.gz`
);
const folly = prefetch(
  `https://github.com/facebook/folly/archive/refs/tags/v${follyVersion}.tar.gz`
);
const fbjni = prefetch(
  `https://repo1.maven.org/maven2/com/facebook/fbjni/fbjni/${fbjniVersion}/fbjni-${fbjniVersion}.aar`
);

catalog.versions[requestedVersion] = {
  fbjniHash: fbjni.hash,
  fbjniVersion,
  follyHash: folly.hash,
  follyVersion,
  hermesHash: hermes.hash,
  hermesVersion,
  reactNativeHash: reactNative.hash,
};
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(
  `Recorded React Native ${requestedVersion} in harness/nix/react-native-versions.json.`
);
