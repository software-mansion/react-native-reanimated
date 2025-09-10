'use strict';

import { RuntimeKind } from "../runtimeKind.js";
import { IS_JEST as RN_IS_JEST, IS_WEB as RN_IS_WEB, IS_WINDOWS as RN_IS_WINDOWS, SHOULD_BE_USE_WEB as RN_SHOULD_BE_USE_WEB } from "./PlatformChecker.js";
let IS_JEST = false;
let IS_WEB = false;
let IS_WINDOWS = false;
let SHOULD_BE_USE_WEB = false;
if (globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative) {
  IS_JEST = RN_IS_JEST;
  IS_WEB = RN_IS_WEB;
  IS_WINDOWS = RN_IS_WINDOWS;
  SHOULD_BE_USE_WEB = RN_SHOULD_BE_USE_WEB;
}
export { IS_JEST, /** @knipIgnore */
IS_WEB, /** @knipIgnore */
IS_WINDOWS, SHOULD_BE_USE_WEB };
//# sourceMappingURL=index.js.map