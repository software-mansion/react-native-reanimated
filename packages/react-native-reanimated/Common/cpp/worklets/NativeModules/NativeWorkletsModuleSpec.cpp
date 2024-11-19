#include <worklets/NativeModules/NativeWorkletsModuleSpec.h>

namespace worklets {

NativeWorkletsModuleSpec::NativeWorkletsModuleSpec(
    const std::shared_ptr<CallInvoker> jsInvoker)
    : TurboModule("NativeWorklets", jsInvoker) {}

} // namespace worklets
