#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

#include <utility>

namespace worklets {

void UIRuntimeDecorator::decorate(
    facebook::jsi::Runtime &uiRuntime,
    std::function<
        void(facebook::jsi::Runtime &rt, const facebook::jsi::Value &callback)>
        &&requestAnimationFrame,
      worklets::forwardedFetch forwardedFetch) {
  uiRuntime.global().setProperty(uiRuntime, "_UI", true);

  jsi_utils::installJsiFunction(
      uiRuntime, "requestAnimationFrame", std::move(requestAnimationFrame));
  
  auto hf = jsi::Function::createFromHostFunction(
      uiRuntime,
      jsi::PropNameID::forAscii(uiRuntime, "sendRequest"),
      2,
      [forwardedFetch](jsi::Runtime &rt,
         const jsi::Value &thisValue,
         const jsi::Value *args,
         size_t count) {
//        return makeShareableBigInt(rt, args[0].asBigInt(rt));
           forwardedFetch(rt, args[0], args[1]);
           return jsi::Value::undefined();
          
      });

      auto TurboModules = uiRuntime.global().getPropertyAsObject(uiRuntime, "TurboModules");

      auto Networking = TurboModules.getPropertyAsFunction(uiRuntime, "get").callWithThis(uiRuntime, TurboModules, "Networking");

      Networking.asObject(uiRuntime).setProperty(uiRuntime, "sendRequest", hf);
  
//   TurboModules.getPropertyAsFunction(uiRuntime, "set").callWithThis(uiRuntime, TurboModules, hf);
  
//   uiRuntime.global().getPropertyAsObject(uiRuntime, "TurboModules").setProperty(uiRuntime, "Networking", hf);
}

} // namespace worklets
