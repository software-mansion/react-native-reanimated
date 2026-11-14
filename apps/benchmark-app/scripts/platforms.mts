import { androidPlatform } from './android-platform.mts';
import { iosPlatform } from './ios-platform.mts';
import type { Platform, PlatformName } from './platform.mts';

export function platformOf(name: PlatformName): Platform {
  return name === 'android' ? androidPlatform() : iosPlatform();
}
