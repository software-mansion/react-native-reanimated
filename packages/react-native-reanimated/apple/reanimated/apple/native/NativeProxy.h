#if __cplusplus

#import <reanimated/NativeModules/ReanimatedModuleProxy.h>
#import <reanimated/apple/REANodesManager.h>
#import <worklets/Tools/UIScheduler.h>
#import <worklets/WorkletRuntime/WorkletRuntime.h>

namespace reanimated {

std::shared_ptr<reanimated::ReanimatedModuleProxy> createReanimatedModuleProxy(
    REANodesManager *nodesManager,
    RCTModuleRegistry *moduleRegistry,
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker,
    std::shared_ptr<worklets::WorkletRuntime> uiWorkletRuntime,
    std::shared_ptr<worklets::UIScheduler> uiScheduler);

} // namespace reanimated

#endif //__cplusplus
