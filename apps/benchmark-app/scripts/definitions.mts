import { ANDROID_DEFINITION } from './android-definition.mts';
import { IOS_DEFINITION } from './ios-definition.mts';
import type { PlatformDefinition, PlatformName } from './platform.mts';

export const PLATFORM_DEFINITIONS: Record<PlatformName, PlatformDefinition> = {
  android: ANDROID_DEFINITION,
  ios: IOS_DEFINITION,
};

export function isPlatformName(value: unknown): value is PlatformName {
  return (
    typeof value === 'string' && Object.hasOwn(PLATFORM_DEFINITIONS, value)
  );
}
