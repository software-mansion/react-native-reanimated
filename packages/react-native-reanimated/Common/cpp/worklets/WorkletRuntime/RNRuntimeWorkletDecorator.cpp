#include <worklets/WorkletRuntime/RNRuntimeWorkletDecorator.h>

namespace worklets {

void RNRuntimeWorkletDecorator::decorate(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<NativeWorkletsModule> &nativeWorkletsModule) {
  rnRuntime.global().setProperty(
      rnRuntime,
      "__workletsModuleProxy",
      jsi::Object::createFromHostObject(rnRuntime, nativeWorkletsModule));
}

} // namespace worklets
