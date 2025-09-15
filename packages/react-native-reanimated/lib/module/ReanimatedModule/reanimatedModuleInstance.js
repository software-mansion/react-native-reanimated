'use strict';

import { SHOULD_BE_USE_WEB } from '../common';
import { createJSReanimatedModule } from './js-reanimated';
import { createNativeReanimatedModule } from './NativeReanimated';
export const ReanimatedModule = SHOULD_BE_USE_WEB ? createJSReanimatedModule() : createNativeReanimatedModule();
//# sourceMappingURL=reanimatedModuleInstance.js.map