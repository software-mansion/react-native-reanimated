'use strict';

import { IS_JEST } from '../common';
import { createJSReanimatedModule } from './js-reanimated';
import { createNativeReanimatedModule } from './NativeReanimated';

export const ReanimatedModule = IS_JEST
  ? createJSReanimatedModule()
  : createNativeReanimatedModule();
