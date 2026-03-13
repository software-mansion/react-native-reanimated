const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function compareMinorVersions(a, b) {
  const [aMajor, aMinor] = a.split('.').map(Number);
  const [bMajor, bMinor] = b.split('.').map(Number);

  if (aMajor !== bMajor) {
    return aMajor - bMajor;
  }

  return aMinor - bMinor;
}

function resolveNpmVersion(pkgName, versionRange) {
  const spec = `${pkgName}@${versionRange}`;
  const rawOutput = execSync(`npm view "${spec}" version --json`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

  const parsed = JSON.parse(rawOutput);
  if (Array.isArray(parsed)) {
    return parsed[parsed.length - 1];
  }

  return parsed;
}

function toRange(version) {
  if (version === 'nightly') {
    return 'nightly';
  }

  return version.includes('x') ? version : `${version}.x`;
}

const compatibilityPath = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'packages',
  'react-native-reanimated',
  'compatibility.json'
);

const workletsCompatibilityPath = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'packages',
  'react-native-worklets',
  'compatibility.json'
);

const compatibilityData = JSON.parse(
  fs.readFileSync(compatibilityPath, 'utf8')
);
const workletsCompatibilityData = JSON.parse(
  fs.readFileSync(workletsCompatibilityPath, 'utf8')
);

const fabricCompatibility = compatibilityData.fabric;
const matrixEntries = [];

for (const [reanimatedRange, details] of Object.entries(fabricCompatibility)) {
  const workletsRanges = details['react-native-worklets'];
  const reactNativeVersions = details['react-native'] || [];

  if (!Array.isArray(workletsRanges) || workletsRanges.length === 0) {
    continue;
  }

  if (reactNativeVersions.length === 0) {
    continue;
  }

  const reanimatedNpmRange = toRange(reanimatedRange);
  const resolvedReanimatedVersion = resolveNpmVersion(
    'react-native-reanimated',
    reanimatedNpmRange
  );

  for (const workletsRange of workletsRanges) {
    const workletsDetails = workletsCompatibilityData[workletsRange];
    const workletsReactNativeVersions = workletsDetails?.['react-native'] || [];

    if (workletsReactNativeVersions.length === 0) {
      continue;
    }

    const commonReactNativeVersions = reactNativeVersions.filter((version) =>
      workletsReactNativeVersions.includes(version)
    );

    if (commonReactNativeVersions.length === 0) {
      continue;
    }

    const latestCommonReactNativeMinor = [...commonReactNativeVersions]
      .sort(compareMinorVersions)
      .at(-1);
    const reactNativeRange = toRange(latestCommonReactNativeMinor);

    const resolvedReactNativeVersion = resolveNpmVersion(
      'react-native',
      reactNativeRange
    );

    const workletsNpmRange = toRange(workletsRange);
    const resolvedWorkletsVersion = resolveNpmVersion(
      'react-native-worklets',
      workletsNpmRange
    );

    matrixEntries.push({
      reactNativeVersion: resolvedReactNativeVersion,
      reanimatedVersion: resolvedReanimatedVersion,
      workletsVersion: resolvedWorkletsVersion,
    });
  }
}

const uniqueEntries = new Map();
for (const entry of matrixEntries) {
  const key = `${entry.reactNativeVersion}-${entry.reanimatedVersion}-${entry.workletsVersion}`;
  uniqueEntries.set(key, entry);
}

const matrix = Array.from(uniqueEntries.values());

fs.writeFileSync(
  '/tmp/reanimated-worklets-matrix.json',
  JSON.stringify(matrix)
);
