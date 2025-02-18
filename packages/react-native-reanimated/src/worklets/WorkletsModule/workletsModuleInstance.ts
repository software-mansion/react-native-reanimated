'use strict';

import { shouldBeUseWeb } from '../../PlatformChecker';
import { createJSWorkletsModule } from './JSWorklets';
import { createNativeWorkletsModule } from './NativeWorklets';

export const WorkletsModule = shouldBeUseWeb()
  ? createJSWorkletsModule()
  : createNativeWorkletsModule();
