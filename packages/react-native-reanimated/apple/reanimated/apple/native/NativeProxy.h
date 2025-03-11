#if __cplusplus

#import <reanimated/NativeModules/ReanimatedModuleProxy.h>
#import <reanimated/apple/REANodesManager.h>

#import <worklets/apple/WorkletsModule.h>

namespace reanimated {

std::shared_ptr<reanimated::ReanimatedModuleProxy> createReanimatedModuleProxy(
    REANodesManager *nodesManager,
    RCTModuleRegistry *moduleRegistry,
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsInvoker,
    WorkletsModule *workletsModule);

} // namespace reanimated

#endif //__cplusplus
