#include <reanimated/RuntimeDecorators/ReanimatedWorkletRuntimeDecorator.h>
#include <reanimated/Tools/PlatformLogger.h>

#include <worklets/Tools/JSISerializer.h>
#include <worklets/Tools/ReanimatedJSIUtils.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

namespace reanimated {

void ReanimatedWorkletRuntimeDecorator::decorate(facebook::jsi::Runtime &rt) {
  worklets::jsi_utils::installJsiFunction(
      rt,
      "_log",
      [](facebook::jsi::Runtime &rt, const facebook::jsi::Value &value) {
        PlatformLogger::log(worklets::stringifyJSIValue(rt, value));
      });
}

} // namespace reanimated
