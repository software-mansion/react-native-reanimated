#if __cplusplus

#import <reanimated/Compat/WorkletsApi.h>
#import <reanimated/NativeModules/ReanimatedModuleProxy.h>
#import <reanimated/apple/REANodesManager.h>

namespace reanimated {

std::shared_ptr<reanimated::ReanimatedModuleProxy> createReanimatedModuleProxy(
    REANodesManager *nodesManager,
    RCTModuleRegistry *moduleRegistry,
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker,
    const std::shared_ptr<worklets::WorkletRuntimeHolder> &uiRuntimeHolder,
    const std::shared_ptr<worklets::UISchedulerHolder> &uiSchedulerHolder);

} // namespace reanimated

#endif //__cplusplus
