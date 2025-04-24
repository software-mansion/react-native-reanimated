'use strict';
import { Platform } from 'react-native';

type localGlobal = typeof global & Record<string, unknown>;

function isChromeDebugger(): boolean {
  return (
    (!(global as localGlobal).nativeCallSyncHook ||
      !!(global as localGlobal).__REMOTEDEV__) &&
    !(global as localGlobal).RN$Bridgeless
  );
}

export const IS_ANDROID = Platform.OS === 'android';
export const IS_IOS = Platform.OS === 'ios';
export const IS_WEB = Platform.OS === 'web';
export const IS_JEST = !!process.env.JEST_WORKER_ID;
export const IS_WINDOWS = Platform.OS === 'windows';
export const IS_CHROME_DEBUGGER = isChromeDebugger();

export const SHOULD_BE_USE_WEB =
  IS_JEST || IS_CHROME_DEBUGGER || IS_WEB || IS_WINDOWS;
