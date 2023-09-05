import { Platform } from 'react-native';

export function isJest(): boolean {
  return !!process.env.JEST_WORKER_ID;
}

export function isChromeDebugger(): boolean {
  return !(global as any).nativeCallSyncHook || (global as any).__REMOTEDEV__;
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

export function nativeShouldBeMock() {
  return isJest() || isChromeDebugger() || isWindows();
}

export function isWindowAvailable() {
  // the window object is unavailable when building the server portion of a site that uses SSG
  // this function shouldn't be used to conditionally render components
  // https://www.joshwcomeau.com/react/the-perils-of-rehydration/
  return typeof window !== 'undefined';
}

export function isReducedMotion() {
  return isWeb()
    ? isWindowAvailable()
      ? !window.matchMedia('(prefers-reduced-motion: no-preference)').matches
      : false
    : global._REANIMATED_IS_REDUCED_MOTION ?? false;
}
