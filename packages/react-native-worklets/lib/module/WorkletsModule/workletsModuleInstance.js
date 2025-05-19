'use strict';

import { shouldBeUseWeb } from "../PlatformChecker.js";
import { createJSWorkletsModule } from "./JSWorklets.js";
import { createNativeWorkletsModule } from "./NativeWorklets.js";
export const WorkletsModule = shouldBeUseWeb() ? createJSWorkletsModule() : createNativeWorkletsModule();
//# sourceMappingURL=workletsModuleInstance.js.map