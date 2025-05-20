#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>
#include <worklets/WorkletRuntime/WorkletRuntimeCollector.h>

#include <utility>

namespace worklets {

void RNRuntimeWorkletDecorator::decorate(
    jsi::Runtime &rnRuntime,
    jsi::Object &&jsiWorkletsModuleProxy) {
  rnRuntime.global().setProperty(rnRuntime, "_WORKLET", false);

  // TODO: Remove _IS_FABRIC sometime in the future
  // react-native-screens 4.9.0 depends on it
  rnRuntime.global().setProperty(rnRuntime, "_IS_FABRIC", true);

  rnRuntime.global().setProperty(
      rnRuntime, "__workletsModuleProxy", std::move(jsiWorkletsModuleProxy));

  WorkletRuntimeCollector::install(rnRuntime);
}

} // namespace worklets
