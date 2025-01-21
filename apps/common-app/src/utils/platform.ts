import { Platform } from 'react-native';

export const IS_WEB = Platform.OS === 'web';
export const IS_ANDROID = Platform.OS === 'android';
export const IS_IOS = Platform.OS === 'ios';
export const IS_MACOS = Platform.OS === 'macos';

export function isFabric(): boolean {
  // eslint-disable-next-line no-underscore-dangle
  return !!(global as Record<string, unknown>)._IS_FABRIC;
}
