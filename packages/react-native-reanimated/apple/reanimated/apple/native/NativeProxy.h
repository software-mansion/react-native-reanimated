#if __cplusplus

#import <reanimated/NativeModules/ReanimatedModuleProxy.h>
#import <reanimated/apple/REANodesManager.h>
#import <worklets/Compat/StableApi.h>

namespace reanimated {

std::shared_ptr<reanimated::ReanimatedModuleProxy> createReanimatedModuleProxy(
    REANodesManager *nodesManager,
    RCTModuleRegistry *moduleRegistry,
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker,
    const std::shared_ptr<worklets::WorkletRuntime> &uiWorkletRuntime,
    const std::shared_ptr<worklets::UIScheduler> &uiScheduler);

} // namespace reanimated

#endif //__cplusplus
