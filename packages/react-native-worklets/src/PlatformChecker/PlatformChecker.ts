'use strict';
import { Platform } from 'react-native';

export function isJest(): boolean {
  return !!process.env.JEST_WORKER_ID;
}

export function isWeb(): boolean {
  return Platform.OS === 'web';
}

export function shouldBeUseWeb() {
  return isJest() || isWeb() || isWindows();
}

function isWindows(): boolean {
  return Platform.OS === 'windows';
}
