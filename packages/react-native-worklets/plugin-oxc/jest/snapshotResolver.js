const path = require('path');

const snapshotDir = path.join(__dirname, '..', 'test', '__snapshots__');

module.exports = {
  resolveSnapshotPath: (testPath) =>
    path.join(snapshotDir, `${path.basename(testPath)}.snap`),
  resolveTestPath: (snapshotPath) =>
    path.join(
      __dirname,
      '..',
      '..',
      'plugin',
      '__tests__',
      path.basename(snapshotPath, '.snap')
    ),
  testPathForConsistencyCheck: path.join(
    __dirname,
    '..',
    '..',
    'plugin',
    '__tests__',
    'plugin-shared.test.ts'
  ),
};
