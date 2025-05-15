'use strict';

import { Platform } from 'react-native';

// This type is necessary since some libraries tend to do a lib check
// and this file causes type errors on `global` access.

export function isJest() {
  return !!process.env.JEST_WORKER_ID;
}

// `isChromeDebugger` also returns true in Jest environment, so `isJest()` check should always be performed first
export function isChromeDebugger() {
  return (!global.nativeCallSyncHook || !!global.__REMOTEDEV__) && !global.RN$Bridgeless;
}
export function isWeb() {
  return Platform.OS === 'web';
}
export function isAndroid() {
  return Platform.OS === 'android';
}
function isWindows() {
  return Platform.OS === 'windows';
}
export function shouldBeUseWeb() {
  return isJest() || isChromeDebugger() || isWeb() || isWindows();
}
export function isWindowAvailable() {
  // the window object is unavailable when building the server portion of a site that uses SSG
  // this function shouldn't be used to conditionally render components
  // https://www.joshwcomeau.com/react/the-perils-of-rehydration/
  // @ts-ignore Fallback if `window` is undefined.
  return typeof window !== 'undefined';
}
//# sourceMappingURL=PlatformChecker.js.map