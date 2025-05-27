'use strict';

import {
  isJest as RNIsJest,
  isWeb as RNIsWeb,
  shouldBeUseWeb as RNShouldBeUseWeb,
} from './PlatformChecker';

const mockedPlatformChecker = {
  isJest: () => false,
  isWeb: () => false,
  shouldBeUseWeb: () => false,
};

let isJest: () => boolean;
let isChromeDebugger: () => boolean;
let isWeb: () => boolean;
let shouldBeUseWeb: () => boolean;

if (globalThis._WORKLET) {
  isJest = mockedPlatformChecker.isJest;
  isWeb = mockedPlatformChecker.isWeb;
  shouldBeUseWeb = mockedPlatformChecker.shouldBeUseWeb;
} else {
  isJest = RNIsJest;
  isWeb = RNIsWeb;
  shouldBeUseWeb = RNShouldBeUseWeb;
}

export { isChromeDebugger, isJest, isWeb, shouldBeUseWeb };
