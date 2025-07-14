'use strict';

// We don't use this script in runtime since `process` might not be available.

const validateVersion = require('./validate-worklets-version');

const result = validateVersion();
if (!result.ok) {
  // eslint-disable-next-line reanimated/use-logger
  console.error('[Reanimated] ' + result.message);
  process.exit(1);
}
