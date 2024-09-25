#include <reanimated/RuntimeDecorators/ReanimatedWorkletRuntimeDecorator.h>
#include <reanimated/Tools/PlatformLogger.h>

#include <worklets/Tools/JSISerializer.h>
#include <worklets/Tools/ReanimatedJSIUtils.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

namespace reanimated {

using namespace worklets;

void ReanimatedWorkletRuntimeDecorator::decorate(jsi::Runtime &rt) {
  jsi_utils::installJsiFunction(
      rt, "_log", [](jsi::Runtime &rt, const jsi::Value &value) {
        PlatformLogger::log(stringifyJSIValue(rt, value));
      });
}

} // namespace reanimated
