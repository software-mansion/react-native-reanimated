#include <worklets/Compat/StableApi.h>
#include <worklets/WorkletRuntime/RuntimeKind.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

namespace worklets {

void UIRuntimeDecorator::decorate(
    facebook::jsi::Runtime &uiRuntime,
    const std::function<void(facebook::jsi::Runtime &rt, const facebook::jsi::Value &callback)>
        &requestAnimationFrame) {
  uiRuntime.global().setProperty(uiRuntime, runtimeKindBindingName, static_cast<int>(RuntimeKind::UI));

  uiRuntime.global().setProperty(uiRuntime, "_UI", true);

  installRequestAnimationFrame(uiRuntime, requestAnimationFrame);
}

} // namespace worklets
