'use strict';

import { createNativeWorkletsModule } from './NativeWorklets';
import { shouldBeUseWeb } from '../PlatformChecker';
import { createJSWorkletsModule } from './JSWorklets';

export const WorkletsModule = shouldBeUseWeb()
  ? createJSWorkletsModule()
  : createNativeWorkletsModule();
