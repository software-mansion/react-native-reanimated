'use strict';

if (globalThis._WORKLET) {
  globalThis._log('mock platformChecker');
  module.exports = {
    isJest: () => false,
    isChromeDebugger: () => false,
    isWeb: () => false,
    isAndroid: () => true,
    isWindows: () => false,
    shouldBeUseWeb: () => false,
    isWindowAvailable: () => false,
  };
} else {
  module.exports = require('./PlatformChecker');
}
