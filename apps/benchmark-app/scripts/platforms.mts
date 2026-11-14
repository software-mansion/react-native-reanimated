import { androidPlatform } from './android-platform.mts';
import { iosPlatform } from './ios-platform.mts';
import type { Platform, PlatformName } from './platform.mts';

const PLATFORMS: Record<PlatformName, () => Platform> = {
  android: androidPlatform,
  ios: iosPlatform,
};

export function platformOf(name: PlatformName): Platform {
  return PLATFORMS[name]();
}
