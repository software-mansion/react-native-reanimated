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

export function isMacOS(): boolean {
  return Platform.OS === 'macos';
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

export function isReducedMotion() {
  return isWeb()
    ? !window.matchMedia('(prefers-reduced-motion: no-preference)').matches
    : global._REANIMATED_IS_REDUCED_MOTION ?? false;
}
