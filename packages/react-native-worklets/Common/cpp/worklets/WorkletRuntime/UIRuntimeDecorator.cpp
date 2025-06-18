#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/RuntimeKind.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

#include <utility>

namespace worklets {

void UIRuntimeDecorator::decorate(
    facebook::jsi::Runtime &uiRuntime,
    std::function<
        void(facebook::jsi::Runtime &rt, const facebook::jsi::Value &callback)>
        &&requestAnimationFrame) {
  const auto &global = uiRuntime.global();

  global.setProperty(uiRuntime, "_RUNTIME_KIND", RuntimeKind::UI);

  uiRuntime.global().setProperty(uiRuntime, "_UI", true);

  jsi_utils::installJsiFunction(
      uiRuntime, "requestAnimationFrame", std::move(requestAnimationFrame));
}

} // namespace worklets
