'use strict';

import { createJSReanimatedModule } from './js-reanimated';
import { shouldBeUseWeb } from '../PlatformChecker';
import { createNativeReanimatedModule } from './NativeReanimated';

// TODO: Verify if check for `shouldBeUseWeb` is necessary here or if
// `.web.ts` file is always preferred instead.
export const ReanimatedModule = shouldBeUseWeb()
  ? createJSReanimatedModule()
  : createNativeReanimatedModule();
