'use strict';

import { shouldBeUseWeb } from "../PlatformChecker.js";
import { createJSReanimatedModule } from "./js-reanimated/index.js";
import { createNativeReanimatedModule } from "./NativeReanimated.js";
export const ReanimatedModule = shouldBeUseWeb() ? createJSReanimatedModule() : createNativeReanimatedModule();
//# sourceMappingURL=reanimatedModuleInstance.js.map