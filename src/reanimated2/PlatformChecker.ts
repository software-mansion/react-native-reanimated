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

export function isMacos(): boolean {
  return Platform.OS === 'macos';
}

export function shouldBeUseWeb() {
  return isJest() || isChromeDebugger() || isWeb() || isMacos();
}

export function nativeShouldBeMock() {
  return isJest() || isChromeDebugger() || isMacos();
}
