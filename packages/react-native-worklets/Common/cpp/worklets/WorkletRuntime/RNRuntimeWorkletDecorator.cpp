#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/Tools/WorkletsVersion.h>
#include <worklets/WorkletRuntime/HermesProfiling.h>
#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#include <worklets/WorkletRuntime/WorkletRuntimeCollector.h>

#include <memory>
#include <string>
#include <utility>

namespace worklets {

void RNRuntimeWorkletDecorator::decorate(
    jsi::Runtime &rnRuntime,
    jsi::Object &&jsiWorkletsModuleProxy,
    const std::shared_ptr<JSLogger> &jsLogger) {
  rnRuntime.global().setProperty(
      rnRuntime, RuntimeData::runtimeKindBindingName, static_cast<int>(RuntimeData::RuntimeKind::ReactNative));

  rnRuntime.global().setProperty(
      rnRuntime,
      RuntimeData::runtimeNameBindingName,
      jsi::String::createFromUtf8(rnRuntime, RuntimeData::rnRuntimeName));

  rnRuntime.global().setProperty(rnRuntime, "_WORKLET", false);

  rnRuntime.global().setProperty(rnRuntime, "__workletsModuleProxy", std::move(jsiWorkletsModuleProxy));

  WorkletRuntimeCollector::install(rnRuntime);

#ifndef NDEBUG
  checkJSVersion(rnRuntime, jsLogger);
#endif // NDEBUG

#ifdef IS_REANIMATED_EXAMPLE_APP
  installDebugBindings(rnRuntime);
#endif // IS_REANIMATED_EXAMPLE_APP

  injectWorkletsCppVersion(rnRuntime);

  rnRuntime.global().setProperty(
      rnRuntime,
      "_startProfiling",
      jsi::Function::createFromHostFunction(
          rnRuntime,
          jsi::PropNameID::forAscii(rnRuntime, "_startProfiling"),
          1,
          [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
            const double meanHzFreq = (count > 0 && !args[0].isUndefined()) ? args[0].asNumber() : 100.0;
            startProfiling(rt, meanHzFreq);
            return jsi::Value::undefined();
          }));

  jsi_utils::installJsiFunction(rnRuntime, "_stopProfiling", [](jsi::Runtime &rt) {
    std::string path = stopProfiling(rt);
    return jsi::String::createFromUtf8(rt, path);
  });
}

#ifdef IS_REANIMATED_EXAMPLE_APP
void RNRuntimeWorkletDecorator::installDebugBindings(jsi::Runtime &rnRuntime) {
  jsi_utils::installJsiFunction(rnRuntime, "__hasNativeState", [](jsi::Runtime &rt, const jsi::Value &value) {
    return jsi::Value(value.isObject() && value.asObject(rt).hasNativeState(rt));
  });
}
#endif // IS_REANIMATED_EXAMPLE_APP

} // namespace worklets
