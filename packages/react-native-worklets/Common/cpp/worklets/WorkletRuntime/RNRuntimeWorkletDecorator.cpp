#include <jsi/jsi.h>
#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>

namespace worklets {

void RNRuntimeWorkletDecorator::decorate(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<WorkletsModuleProxy> &workletsModuleProxy) {
  rnRuntime.global().setProperty(rnRuntime, "_WORKLET", false);

  // TODO: Remove _IS_FABRIC sometime in the future
  // react-native-screens 4.9.0 depends on it
  rnRuntime.global().setProperty(rnRuntime, "_IS_FABRIC", true);

  rnRuntime.global().setProperty(
      rnRuntime,
      "__workletsModuleProxy",
      jsi::Object::createFromHostObject(rnRuntime, workletsModuleProxy));

  jsi_utils::installJsiFunction(
      rnRuntime,
      "__registerWorkletBundle",
      [&workletsModuleProxy](jsi::Runtime &rt, const jsi::Value &bundleStr) {
        const auto bundle = bundleStr.asString(rt).utf8(rt);
        auto &uiRuntime =
            workletsModuleProxy->getUIWorkletRuntime()->getJSIRuntime();

        workletsModuleProxy->getUIScheduler()->scheduleOnUI(
            [bundle, &uiRuntime] {
              auto buffer = std::make_shared<jsi::StringBuffer>(bundle);
              uiRuntime.evaluateJavaScript(buffer, "");
            });
        return jsi::Value::undefined();
      });
}

} // namespace worklets
