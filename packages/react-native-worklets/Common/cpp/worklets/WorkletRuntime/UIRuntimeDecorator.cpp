#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/RuntimeKind.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

#include <utility>

namespace worklets {

void UIRuntimeDecorator::decorate(
    facebook::jsi::Runtime &uiRuntime,
    std::function<void(facebook::jsi::Runtime &rt, const facebook::jsi::Value &callback)> &&requestAnimationFrame) {
  uiRuntime.global().setProperty(uiRuntime, runtimeKindBindingName, static_cast<int>(RuntimeKind::UI));

  uiRuntime.global().setProperty(uiRuntime, "_UI", true);

  jsi_utils::installJsiFunction(uiRuntime, "requestAnimationFrame", std::move(requestAnimationFrame));
}

} // namespace worklets
