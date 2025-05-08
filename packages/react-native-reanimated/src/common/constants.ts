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

function isWindowAvailable() {
  // the window object is unavailable when building the server portion of a site that uses SSG
  // this function shouldn't be used to conditionally render components
  // https://www.joshwcomeau.com/react/the-perils-of-rehydration/
  // @ts-ignore Fallback if `window` is undefined.
  return typeof window !== 'undefined';
}

export const IS_ANDROID: boolean = Platform.OS === 'android';
export const IS_IOS: boolean = Platform.OS === 'ios';
export const IS_WEB: boolean = Platform.OS === 'web';
export const IS_JEST: boolean = !!process.env.JEST_WORKER_ID;
export const IS_WINDOWS: boolean = Platform.OS === 'windows';

export const IS_CHROME_DEBUGGER: boolean = isChromeDebugger();
export const IS_WINDOW_AVAILABLE: boolean = isWindowAvailable();

export const SHOULD_BE_USE_WEB =
  IS_JEST || IS_CHROME_DEBUGGER || IS_WEB || IS_WINDOWS;
