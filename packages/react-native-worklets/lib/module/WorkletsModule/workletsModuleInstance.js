'use strict';

import { SHOULD_BE_USE_WEB } from "../PlatformChecker/index.js";
import { createJSWorkletsModule } from "./JSWorklets.js";
import { createNativeWorkletsModule } from "./NativeWorklets.js";
export const WorkletsModule = SHOULD_BE_USE_WEB ? createJSWorkletsModule() : createNativeWorkletsModule();
//# sourceMappingURL=workletsModuleInstance.js.map