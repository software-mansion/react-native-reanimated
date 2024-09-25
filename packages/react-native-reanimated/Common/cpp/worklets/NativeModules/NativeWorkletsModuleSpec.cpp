#include <worklets/NativeModules/NativeWorkletsModuleSpec.h>

#define SPEC_PREFIX(FN_NAME) __hostFunction_NativeWorkletsModuleSpec_##FN_NAME

namespace reanimated {

NativeWorkletsModuleSpec::NativeWorkletsModuleSpec(
    const std::shared_ptr<CallInvoker> jsInvoker)
    : TurboModule("CommonWorklets", jsInvoker) {}
} // namespace reanimated
