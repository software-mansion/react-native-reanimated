'use strict';

import {
  isChromeDebugger as RNIsChromeDebugger,
  isJest as RNIsJest,
  isWeb as RNIsWeb,
  shouldBeUseWeb as RNShouldBeUseWeb,
} from './PlatformChecker';

const mockedPlatformChecker = {
  isJest: () => false,
  isChromeDebugger: () => false,
  isWeb: () => false,
  shouldBeUseWeb: () => false,
};

export const isJest = globalThis._WORKLET
  ? mockedPlatformChecker.isJest
  : RNIsJest;
export const isWeb = globalThis._WORKLET
  ? mockedPlatformChecker.isWeb
  : RNIsWeb;
export const shouldBeUseWeb = globalThis._WORKLET
  ? mockedPlatformChecker.shouldBeUseWeb
  : RNShouldBeUseWeb;
export const isChromeDebugger = globalThis._WORKLET
  ? mockedPlatformChecker.isChromeDebugger
  : RNIsChromeDebugger;
