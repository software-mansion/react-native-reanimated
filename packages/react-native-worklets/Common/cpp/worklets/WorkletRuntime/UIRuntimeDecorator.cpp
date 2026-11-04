#include <worklets/Compat/StableApi.h>
#include <worklets/RunLoop/FrameTimestamp.h>
#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/RuntimeData.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

#include <cmath>

namespace worklets {

void UIRuntimeDecorator::decorate(
    facebook::jsi::Runtime &uiRuntime,
    const std::function<void(facebook::jsi::Runtime &rt, const facebook::jsi::Value &callback)> &requestAnimationFrame,
    const std::function<double()> &getCurrentFrameTimestamp) {
  installRequestAnimationFrame(uiRuntime, requestAnimationFrame);

  jsi_utils::installJsiFunction(
      uiRuntime, "__getCurrentFrameTimestamp", [getCurrentFrameTimestamp](jsi::Runtime &) -> jsi::Value {
        // A callback that has published its timestamp (the display link, the
        // draw pass) wins over the platform query. Android's query covers the
        // rest of the choreographer frame, including input that ran before the
        // animation callback. Both are empty between frames.
        if (const auto scoped = FrameTimestampScope::current()) {
          return jsi::Value(*scoped);
        }
        const double timestamp = getCurrentFrameTimestamp();
        if (std::isnan(timestamp)) {
          return jsi::Value::undefined();
        }
        return jsi::Value(timestamp);
      });
}

} // namespace worklets
