'use strict';
import { Platform } from 'react-native';

// This type is necessary since some libraries tend to do a lib check
// and this file causes type errors on `global` access.
type localGlobal = typeof global & Record<string, unknown>;

export function isJest(): boolean {
  return !!process.env.JEST_WORKER_ID;
}

// `isChromeDebugger` also returns true in Jest environment, so `isJest()` check should always be performed first
export function isChromeDebugger(): boolean {
  return (
    (!(global as localGlobal).nativeCallSyncHook ||
      !!(global as localGlobal).__REMOTEDEV__) &&
    !(global as localGlobal).RN$Bridgeless
  );
}

export function isWeb(): boolean {
  return Platform.OS === 'web';
}

export function isAndroid(): boolean {
  return Platform.OS === 'android';
}

function isWindows(): boolean {
  return Platform.OS === 'windows';
}

export function shouldBeUseWeb() {
  return isJest() || isChromeDebugger() || isWeb() || isWindows();
}

export function isFabric() {
  return !!(global as localGlobal)._IS_FABRIC;
}

export function isWindowAvailable() {
  // the window object is unavailable when building the server portion of a site that uses SSG
  // this function shouldn't be used to conditionally render components
  // https://www.joshwcomeau.com/react/the-perils-of-rehydration/
  // @ts-ignore Fallback if `window` is undefined.
  return typeof window !== 'undefined';
}

export function isReducedMotion() {
  return isWeb()
    ? isWindowAvailable()
      ? // @ts-ignore Fallback if `window` is undefined.
        !window.matchMedia('(prefers-reduced-motion: no-preference)').matches
      : false
    : !!(global as localGlobal)._REANIMATED_IS_REDUCED_MOTION;
}
