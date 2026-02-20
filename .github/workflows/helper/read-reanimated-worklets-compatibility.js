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

function sanitizeForKey(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-');
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

const compatibilityData = JSON.parse(
  fs.readFileSync(compatibilityPath, 'utf8')
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

  const latestReactNativeMinor = [...reactNativeVersions]
    .sort(compareMinorVersions)
    .at(-1);
  const reactNativeRange = toRange(latestReactNativeMinor);
  const reanimatedNpmRange = toRange(reanimatedRange);
  const resolvedReactNativeVersion = resolveNpmVersion(
    'react-native',
    reactNativeRange
  );
  const resolvedReanimatedVersion = resolveNpmVersion(
    'react-native-reanimated',
    reanimatedNpmRange
  );

  for (const workletsRange of workletsRanges) {
    const workletsNpmRange = toRange(workletsRange);
    const resolvedWorkletsVersion = resolveNpmVersion(
      'react-native-worklets',
      workletsNpmRange
    );

    const cacheKey = [
      sanitizeForKey(resolvedReactNativeVersion),
      sanitizeForKey(resolvedReanimatedVersion),
      sanitizeForKey(resolvedWorkletsVersion),
      'android-debug-v1',
    ].join('-');

    matrixEntries.push({
      reactNativeRange,
      reactNativeVersion: resolvedReactNativeVersion,
      reanimatedRange: reanimatedNpmRange,
      reanimatedVersion: resolvedReanimatedVersion,
      workletsRange: workletsNpmRange,
      workletsVersion: resolvedWorkletsVersion,
      cacheKey,
    });
  }
}

const uniqueByCacheKey = new Map();
for (const entry of matrixEntries) {
  uniqueByCacheKey.set(entry.cacheKey, entry);
}

const matrix = Array.from(uniqueByCacheKey.values());

fs.writeFileSync(
  '/tmp/reanimated-worklets-matrix.json',
  JSON.stringify(matrix)
);
