#include "ReanimatedWorkletRuntimeDecorator.h"
#include "JSISerializer.h"
#include "PlatformLogger.h"
#include "ReanimatedJSIUtils.h"
#include "WorkletRuntime.h"

namespace reanimated {

void ReanimatedWorkletRuntimeDecorator::decorate(jsi::Runtime &rt) {
  jsi_utils::installJsiFunction(
      rt, "_log", [](jsi::Runtime &rt, const jsi::Value &value) {
        PlatformLogger::log(stringifyJSIValue(rt, value));
      });
}

} // namespace reanimated
