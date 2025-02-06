#include <worklets/Tools/ReanimatedJSIUtils.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

using facebook::jsi::Runtime;

namespace worklets {

void UIRuntimeDecorator::decorate(Runtime &uiRuntime) {
  uiRuntime.global().setProperty(uiRuntime, "_UI", true);

  // TODO: Without the following you can't do `runOnUI` since the
  // queue is not established. Decide if it should be here or in
  // Reanimated.
  // jsi_utils::installJsiFunction(
  // uiRuntime, "_maybeFlushUIUpdatesQueue", maybeFlushUIUpdatesQueue);
}

} // namespace worklets
