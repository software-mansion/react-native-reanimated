'use strict';

import { SHOULD_BE_USE_WEB } from '../PlatformChecker';
import { createJSWorkletsModule } from './JSWorklets';
import { createNativeWorkletsModule } from './NativeWorklets';

export const WorkletsModule = SHOULD_BE_USE_WEB
  ? createJSWorkletsModule()
  : createNativeWorkletsModule();
