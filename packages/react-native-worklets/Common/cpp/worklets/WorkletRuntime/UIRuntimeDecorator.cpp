#include <worklets/Tools/WorkletsJSIUtils.h>
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

  const auto mapPrototype = uiRuntime.global()
                                .getProperty(uiRuntime, "Map")
                                .asObject(uiRuntime)
                                .asFunction(uiRuntime);

  uiRuntime.global().setProperty(
      uiRuntime, "__workletsCache", mapPrototype.callAsConstructor(uiRuntime));

  const auto weakMapPrototype = uiRuntime.global()
                                    .getProperty(uiRuntime, "WeakMap")
                                    .asObject(uiRuntime)
                                    .asFunction(uiRuntime);

  uiRuntime.global().setProperty(
      uiRuntime,
      "__handleCache",
      weakMapPrototype.callAsConstructor(uiRuntime));

  uiRuntime.global().setProperty(
      uiRuntime,
      "__shareableMappingCache",
      weakMapPrototype.callAsConstructor(uiRuntime));

  const auto symbolPrototype = uiRuntime.global()
                                   .getProperty(uiRuntime, "Symbol")
                                   .asObject(uiRuntime)
                                   .asFunction(uiRuntime);

  uiRuntime.global().setProperty(
      uiRuntime,
      "__shareableMappingFlag",
      symbolPrototype.call(
          uiRuntime,
          jsi::String::createFromAscii(uiRuntime, "shareable flag")));
}

} // namespace worklets
