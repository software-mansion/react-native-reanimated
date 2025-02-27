#include <worklets/Tools/ReanimatedJSIUtils.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

#include <utility>

namespace worklets {

void UIRuntimeDecorator::decorate(
    facebook::jsi::Runtime &uiRuntime,
    std::function<
        void(facebook::jsi::Runtime &rt, const facebook::jsi::Value &callback)>
        &&requestAnimationFrame) {
  uiRuntime.global().setProperty(uiRuntime, "_UI", true);

  jsi_utils::installJsiFunction(
      uiRuntime, "requestAnimationFrame", std::move(requestAnimationFrame));

  // TODO: Without the following you can't do `runOnUI` since the
  // queue is not established. Decide if it should be here or in
  // Reanimated.
  // jsi_utils::installJsiFunction(
  // uiRuntime, "_maybeFlushUIUpdatesQueue", maybeFlushUIUpdatesQueue);
}

} // namespace worklets
