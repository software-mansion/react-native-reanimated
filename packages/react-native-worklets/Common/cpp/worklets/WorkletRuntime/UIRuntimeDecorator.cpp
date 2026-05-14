#include <worklets/Compat/StableApi.h>
#include <worklets/WorkletRuntime/RuntimeData.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

namespace worklets {

void UIRuntimeDecorator::decorate(
    facebook::jsi::Runtime &uiRuntime,
    const std::function<void(facebook::jsi::Runtime &rt, const facebook::jsi::Value &callback)>
        &requestAnimationFrame) {
  installRequestAnimationFrame(uiRuntime, requestAnimationFrame);
}

} // namespace worklets
