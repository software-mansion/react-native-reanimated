'use strict';

import { shouldBeUseWeb } from '../PlatformChecker';
import { createJSWorkletsModule } from './JSWorklets';
import { createNativeWorkletsModule } from './NativeWorklets';

// eslint-disable-next-line @ericcornelissen/top/no-top-level-side-effects
export const WorkletsModule = shouldBeUseWeb()
  ? createJSWorkletsModule()
  : createNativeWorkletsModule();
