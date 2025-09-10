'use strict';

import { SHOULD_BE_USE_WEB } from "../common/index.js";
import { createJSReanimatedModule } from "./js-reanimated/index.js";
import { createNativeReanimatedModule } from "./NativeReanimated.js";
export const ReanimatedModule = SHOULD_BE_USE_WEB ? createJSReanimatedModule() : createNativeReanimatedModule();
//# sourceMappingURL=reanimatedModuleInstance.js.map