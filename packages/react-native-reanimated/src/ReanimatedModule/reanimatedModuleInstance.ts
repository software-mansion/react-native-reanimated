'use strict';

import { shouldBeUseWeb } from '../PlatformChecker';
import { createJSReanimatedModule } from './js-reanimated';
import { createNativeReanimatedModule } from './NativeReanimated';

export const ReanimatedModule = shouldBeUseWeb()
  ? createJSReanimatedModule()
  : createNativeReanimatedModule();
