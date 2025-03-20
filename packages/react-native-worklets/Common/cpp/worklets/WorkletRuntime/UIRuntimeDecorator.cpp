#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

#include <utility>

namespace worklets {

void UIRuntimeDecorator::decorate(
    facebook::jsi::Runtime &uiRuntime,
    std::function<
        void(facebook::jsi::Runtime &rt, const facebook::jsi::Value &callback)>
        &&requestAnimationFrame,
                                  std::function<void(std::string, std::string, std::function<void(std::string)>)>  &&fetch) {
  uiRuntime.global().setProperty(uiRuntime, "_UI", true);

  jsi_utils::installJsiFunction(
      uiRuntime, "requestAnimationFrame", std::move(requestAnimationFrame));

    auto jsiFetch = [fetch](facebook::jsi::Runtime &rt, const facebook::jsi::Value &url) {
        auto urlStr = url.asString(rt).utf8(rt);
        fetch("GET", urlStr, [&rt](std::string response) {
            rt.global().setProperty(rt, "response", response);
        });
    };

    jsi_utils::installJsiFunction(
        uiRuntime, "fetch", std::move(jsiFetch));
}

} // namespace worklets
