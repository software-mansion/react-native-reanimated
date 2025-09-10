'use strict';

import { Platform } from 'react-native';
function isWindowAvailable() {
  // the window object is unavailable when building the server portion of a site that uses SSG
  // this function shouldn't be used to conditionally render components
  // https://www.joshwcomeau.com/react/the-perils-of-rehydration/
  // @ts-ignore Fallback if `window` is undefined.
  return typeof window !== 'undefined';
}
export const IS_ANDROID = Platform.OS === 'android';
/** @knipIgnore */
export const IS_IOS = Platform.OS === 'ios';
export const IS_WEB = Platform.OS === 'web';
export const IS_JEST = !!process.env.JEST_WORKER_ID;
/** @knipIgnore */
export const IS_WINDOWS = Platform.OS === 'windows';
export const IS_WINDOW_AVAILABLE = isWindowAvailable();
export const SHOULD_BE_USE_WEB = IS_JEST || IS_WEB || IS_WINDOWS;
//# sourceMappingURL=constants.js.map