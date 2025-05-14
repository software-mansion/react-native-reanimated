'use strict';
import { Platform } from 'react-native';

// This type is necessary since some libraries tend to do a lib check
// and this file causes type errors on `global` access.
type localGlobal = typeof globalThis & Record<string, unknown>;

export function isJest(): boolean {
  return !!process.env.JEST_WORKER_ID;
}

// `isChromeDebugger` also returns true in Jest environment, so `isJest()` check should always be performed first
export function isChromeDebugger(): boolean {
  return (
    (!(globalThis as localGlobal).nativeCallSyncHook ||
      !!(globalThis as localGlobal).__REMOTEDEV__) &&
    !(globalThis as localGlobal).RN$Bridgeless
  );
}

export function isWeb(): boolean {
  return Platform.OS === 'web';
}

export function shouldBeUseWeb() {
  return isJest() || isChromeDebugger() || isWeb() || isWindows();
}

function isWindows(): boolean {
  return Platform.OS === 'windows';
}
