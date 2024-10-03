'use strict';

import { createNativeWorkletsModule } from './NativeWorklets';
import { shouldBeUseWeb } from '../../PlatformChecker';
import { createJSWorkletsModule } from './JSWorklets';

// TODO: Verify if check for `shouldBeUseWeb` is necessary here or if
// `.web.ts` file is always preferred instead.
export const WorkletsModule = shouldBeUseWeb()
  ? createJSWorkletsModule()
  : createNativeWorkletsModule();
