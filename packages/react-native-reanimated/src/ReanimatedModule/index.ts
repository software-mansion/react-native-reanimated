'use strict';
import { createJSReanimatedModule } from './js-reanimated';
import { shouldBeUseWeb } from '../PlatformChecker';
import { createNativeReanimatedModule } from './NativeReanimated';

export const ReanimatedModule = shouldBeUseWeb()
  ? createJSReanimatedModule()
  : createNativeReanimatedModule();
